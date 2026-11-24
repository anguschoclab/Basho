/**
 * avatar-polish-entities.ts
 * =========================
 * Per-entity polished portraits: renders the procedural 24×24 avatar for a
 * set of entity seeds, polishes each through Gemini, and writes the results
 * into src/components/avatar/polished/entities/ plus entityManifest.json
 * (seed → file), which polishedCatalog resolves at render time before the
 * feature-matrix signature fallback.
 *
 * Specs sources (one required):
 *   --specs <file.json>   [{seed, nationality?, role?, ...AvatarStageInput}]
 *   --count <n>           n deterministic synthetic entities across roles
 *   --world <file.json>   extract every person entity from a world JSON
 *                         (rikishi, oyakata, staff, gyoji/shimpan pools,
 *                         talent/candidate pools, academy prospects+staff)
 *
 * Flags: --model <m>  --concurrency <n>  --limit <n>
 *
 * Requires GEMINI_API_KEY in ./.env (or the environment). Re-runs skip
 * seeds already present in entityManifest.json.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { generateAvatarIdentity, deriveAvatarStage } from "@/engine/generation/avatarGenerator";
import { composeAvatar } from "@/components/avatar/pixelCompose";
import type { AvatarRole, AvatarStageInput } from "@/engine/types/avatar";
import { NATIONALITY_SKIN_TONES } from "@/engine/types/avatar";
import { svgFromPaths, slug } from "./lib/avatar-sheet";
import {
  AVATAR_PROMPT,
  callGeminiImage,
  loadApiKey,
  pickImageModel,
  withRetry,
} from "./lib/gemini-image";

// ---------------------------------------------------------------------------
// Specs
// ---------------------------------------------------------------------------

interface EntitySpec {
  seed: string;
  nationality: string;
  role: AvatarRole;
  stageInput: AvatarStageInput;
}

interface SpecFileEntry {
  seed: string;
  nationality?: string;
  role?: AvatarRole;
  [k: string]: unknown;
}

const NATS = Object.keys(NATIONALITY_SKIN_TONES);
const ROLES: AvatarRole[] = ["rikishi", "prospect", "oyakata", "gyoji", "shimpan", "staff"];
const DIVISIONS = ["jonokuchi", "jonidan", "sandanme", "makushita", "juryo", "makuuchi"] as const;
const STAFF_ROLES = ["technique_coach", "medical_staff", "nutritionist", "scout", "administrator"];
const GYOJI_RANKS = ["tate", "fuku-tate", "sanyaku", "makuuchi", "juryo", "makushita"] as const;

function syntheticSpecs(count: number): EntitySpec[] {
  const specs: EntitySpec[] = [];
  for (let i = 0; i < count; i++) {
    const role = ROLES[i % ROLES.length];
    const nationality = NATS[i % NATS.length];
    const stageInput: AvatarStageInput = { role, age: 17 + ((i * 7) % 55) };
    if (role === "rikishi") {
      stageInput.division = DIVISIONS[i % DIVISIONS.length];
      stageInput.weight = 95 + ((i * 13) % 110);
      if (i % 5 === 0) stageInput.rank = "yokozuna";
      if (i % 11 === 0) stageInput.injured = true;
      if (i % 13 === 0) stageInput.glasses = true;
    } else if (role === "staff") {
      stageInput.staffRole = STAFF_ROLES[i % STAFF_ROLES.length];
    } else if (role === "gyoji") {
      stageInput.gyojiRank = GYOJI_RANKS[i % GYOJI_RANKS.length];
    } else if (role === "prospect") {
      stageInput.weight = 75 + ((i * 9) % 60);
    }
    specs.push({ seed: `ent::${i}`, nationality, role, stageInput });
  }
  return specs;
}

type AnyRec = Record<string, unknown>;

function vals<T extends AnyRec>(c: unknown): T[] {
  if (c instanceof Map) return [...c.values()] as T[];
  if (Array.isArray(c)) return c as T[];
  if (c && typeof c === "object") return Object.values(c) as T[];
  return [];
}

const FOREIGN_REGION_NAMES = new Set(["mongolia", "georgia", "egypt", "brazil", "usa"]);

function worldSpecs(w: AnyRec): EntitySpec[] {
  const year = (w.year ?? w.currentYear ?? 2030) as number;
  const specs: EntitySpec[] = [];

  const rikishiVals = [...vals<AnyRec>(w.rikishi as AnyRec), ...vals<AnyRec>(w.historicalRikishi as AnyRec)];
  const rikishiById = new Map(rikishiVals.map((r) => [String(r.id), r]));

  for (const r of rikishiVals) {
    specs.push({
      seed: String((r.avatarConfig as AnyRec | undefined)?.seed ?? r.id),
      nationality: String(r.nationality ?? "Japan"),
      role: "rikishi",
      stageInput: {
        role: "rikishi",
        age: (r.age as number) ?? year - ((r.birthYear as number) ?? year),
        division: r.division as AvatarStageInput["division"],
        rank: r.rank as AvatarStageInput["rank"],
        weight: r.weight as number | undefined,
        injured: Boolean(r.injured) || Boolean(r.isKyujo),
        glasses: (r.quirks as AnyRec | undefined)?.glasses != null,
        aggression: (r.stats as AnyRec | undefined)?.aggression as number | undefined,
        momentum: r.momentum as number | undefined,
        isRetired: Boolean(r.isRetired),
      },
    });
  }

  for (const o of vals<AnyRec>(w.oyakata as AnyRec)) {
    const former = o.formerRikishiId ? rikishiById.get(String(o.formerRikishiId)) : undefined;
    specs.push({
      seed: String((o.avatarConfig as AnyRec | undefined)?.seed ?? o.formerRikishiId ?? o.id),
      nationality: String(former?.nationality ?? "Japan"),
      role: "oyakata",
      stageInput: { role: "oyakata", age: o.age as number | undefined, weight: o.weight as number | undefined },
    });
  }

  for (const s of vals<AnyRec>(w.staff as AnyRec)) {
    specs.push({
      seed: String((s.avatarConfig as AnyRec | undefined)?.seed ?? s.id),
      nationality: "Japan",
      role: "staff",
      stageInput: { role: "staff", age: s.age as number | undefined, staffRole: s.role as string },
    });
  }

  for (const g of (w.gyojiPool as AnyRec[] | undefined) ?? []) {
    specs.push({
      seed: String((g.avatarConfig as AnyRec | undefined)?.seed ?? g.id),
      nationality: "Japan",
      role: "gyoji",
      stageInput: {
        role: "gyoji",
        age: (g.age as number | undefined) ?? 35 + ((g.yearsActive as number | undefined) ?? 0),
        gyojiRank: g.rank as AvatarStageInput["gyojiRank"],
      },
    });
  }

  for (const s of (w.shimpanPool as AnyRec[] | undefined) ?? []) {
    specs.push({
      seed: String((s.avatarConfig as AnyRec | undefined)?.seed ?? s.id),
      nationality: "Japan",
      role: "shimpan",
      stageInput: {
        role: "shimpan",
        age: (s.age as number | undefined) ?? 40 + ((s.yearsActive as number | undefined) ?? 0),
      },
    });
  }

  for (const pool of [w.talentPool, w.candidatePool] as (AnyRec | undefined)[]) {
    for (const c of vals<AnyRec>(pool?.candidates as AnyRec)) {
      specs.push({
        seed: String((c.avatarConfig as AnyRec | undefined)?.seed ?? c.personId),
        nationality: String(c.nationality ?? "Japan"),
        role: "prospect",
        stageInput: {
          role: "prospect",
          age: year - ((c.birthYear as number) ?? year - 18),
          weight: c.weightPotentialKg as number | undefined,
        },
      });
    }
  }

  for (const h of vals<AnyRec>(w.heyas as AnyRec)) {
    const academy = h.youthAcademy as AnyRec | undefined;
    for (const p of (academy?.prospects as AnyRec[] | undefined) ?? []) {
      const region = String(p.region ?? "");
      specs.push({
        seed: String((p.avatarConfig as AnyRec | undefined)?.seed ?? p.id),
        nationality: FOREIGN_REGION_NAMES.has(region.toLowerCase()) ? region : "Japan",
        role: "prospect",
        stageInput: {
          role: "prospect",
          age: (p.age as number | undefined) ?? 17,
          weight: p.weight as number | undefined,
        },
      });
    }
    for (const s of (academy?.staff as AnyRec[] | undefined) ?? []) {
      specs.push({
        seed: String((s.avatarConfig as AnyRec | undefined)?.seed ?? s.id),
        nationality: "Japan",
        role: "staff",
        stageInput: {
          role: "staff",
          age: (s.age as number | undefined) ?? 40,
          staffRole: s.role as string,
        },
      });
    }
  }

  return specs;
}

// ---------------------------------------------------------------------------
// Args + io
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const opt = (name: string, dflt: string) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : dflt;
};

const OUT_DIR = resolve("src/components/avatar/polished/entities");
const SRC_DIR = resolve("docs/avatar-contact-sheet/entities-src");
const MANIFEST_PATH = resolve("src/components/avatar/entityManifest.json");
for (const d of [OUT_DIR, SRC_DIR]) mkdirSync(d, { recursive: true });

const CONCURRENCY = Math.max(1, parseInt(opt("--concurrency", "3"), 10) || 3);
const SHOT_PX = 192;

const fileNameFor = (seed: string) =>
  `ent-${slug(seed).slice(0, 60)}-${createHash("sha1").update(seed).digest("hex").slice(0, 6)}`;

let specs: EntitySpec[];
const specsPath = opt("--specs", "");
const worldPath = opt("--world", "");
const count = parseInt(opt("--count", "0"), 10) || 0;

if (specsPath) {
  const raw = JSON.parse(readFileSync(resolve(specsPath), "utf8")) as SpecFileEntry[];
  specs = raw.map((e) => {
    const { seed, nationality, role, ...rest } = e;
    return {
      seed: String(seed),
      nationality: nationality ?? "Japan",
      role: role ?? "rikishi",
      stageInput: { role: role ?? "rikishi", ...rest } as AvatarStageInput,
    };
  });
} else if (worldPath) {
  specs = worldSpecs(JSON.parse(readFileSync(resolve(worldPath), "utf8")));
} else if (count > 0) {
  specs = syntheticSpecs(count);
} else {
  console.error("provide --specs <file>, --world <file>, or --count <n>");
  process.exit(1);
}

// Dedupe by seed (first wins).
specs = [...new Map(specs.map((s) => [s.seed, s])).values()];

const limit = parseInt(opt("--limit", "0"), 10) || 0;
if (limit > 0) specs = specs.slice(0, limit);

// Manifest merge — re-runs accumulate.
const manifest: Record<string, string> = existsSync(MANIFEST_PATH)
  ? JSON.parse(readFileSync(MANIFEST_PATH, "utf8"))
  : {};

const pending = specs.filter((s) => !(s.seed in manifest));
console.log(`${specs.length} specs, ${pending.length} to polish (${specs.length - pending.length} cached)`);

// ---------------------------------------------------------------------------
// Render + polish
// ---------------------------------------------------------------------------

const API_KEY = loadApiKey();
const model = opt("--model", "") || (await pickImageModel(API_KEY));
console.log(`using model: ${model}`);

// Render source PNGs for pending specs via Playwright.
{
  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 2 });
  const cells = pending.map((s) => {
    const identity = generateAvatarIdentity({
      seed: s.seed,
      nationality: s.nationality,
      role: s.role,
    });
    const stage = deriveAvatarStage(s.stageInput, identity);
    const svg = svgFromPaths(composeAvatar(identity, stage), SHOT_PX);
    return `<div data-key="${fileNameFor(s.seed)}" style="display:inline-block">${svg}</div>`;
  });
  await page.setContent(
    `<!doctype html><html><body style="margin:0">${cells.join("\n")}</body></html>`,
    { waitUntil: "load" }
  );
  for (const s of pending) {
    const p = join(SRC_DIR, `${fileNameFor(s.seed)}.png`);
    if (!existsSync(p)) {
      await page.locator(`[data-key="${fileNameFor(s.seed)}"]`).screenshot({ path: p });
    }
  }
  await browser.close();
}

let done = 0;
let failed = 0;
let idx = 0;
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (idx < pending.length) {
      const s = pending[idx++];
      const file = fileNameFor(s.seed);
      const outPath = join(OUT_DIR, `${file}.png`);
      if (!existsSync(outPath)) {
        try {
          const src = readFileSync(join(SRC_DIR, `${file}.png`));
          const out = await withRetry(() => callGeminiImage(API_KEY, model, src, AVATAR_PROMPT));
          writeFileSync(outPath, out);
        } catch (e) {
          failed++;
          console.error(`  ✗ ${s.seed}: ${e instanceof Error ? e.message : e}`);
          continue;
        }
      }
      manifest[s.seed] = `entities/${file}.png`;
      done++;
      if (done % 10 === 0 || done === pending.length) console.log(`  ${done}/${pending.length}`);
    }
  })
);

writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 1) + "\n");
console.log(`wrote ${MANIFEST_PATH} (${Object.keys(manifest).length} entities)`);
if (failed) console.log(`finished with ${failed} failed item(s) — re-run to retry`);
