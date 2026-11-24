/**
 * Shared spec + render helpers for avatar sheet scripts.
 * Used by avatar-contact-sheet.ts and avatar-polish-gemini.ts.
 *
 * Coverage philosophy: enumerate the generator's full feature space
 * procedurally (identities/stages built explicitly for matrix sections) —
 * no saved/entity avatars are consulted.
 */

import { generateAvatarIdentity, deriveAvatarStage } from "@/engine/generation/avatarGenerator";
import { composeAvatar } from "@/components/avatar/pixelCompose";
import {
  OICHOMAGE_FAN,
  CHONMAGE_KNOT,
  EBOSHI_CAP,
  GLASSES_FRAME,
  TSUNA_ROPE,
  BANDAGE_PATCH,
  type PixelRun,
  type PaletteSlot,
} from "@/components/avatar/pixelAtlas";
import {
  HAIR_COLORS,
  NATIONALITY_SKIN_TONES,
  type AvatarGenerationParams,
  type AvatarIdentity,
  type AvatarStage,
  type AvatarStageInput,
} from "@/engine/types/avatar";

export interface SheetItem {
  /** Filesystem-safe unique key (used for per-item PNG names). */
  key: string;
  label: string;
  svg: string;
  /** "avatar" | "part" — polish scripts pick prompts per kind. */
  kind: "avatar" | "part";
}

export interface SheetSection {
  title: string;
  items: SheetItem[];
}

interface Cell {
  label: string;
  gen: AvatarGenerationParams;
  stage: AvatarStageInput;
}

const NATS = Object.keys(NATIONALITY_SKIN_TONES);
const DIVISIONS = ["jonokuchi", "jonidan", "sandanme", "makushita", "juryo", "makuuchi"] as const;

function rikishi(label: string, i: number, stage: AvatarStageInput, nationality = "japan"): Cell {
  return {
    label,
    gen: { seed: `sheet::rikishi::${label}::${i}`, nationality, role: "rikishi" },
    stage: { role: "rikishi", ...stage },
  };
}

// ---------------------------------------------------------------------------
// Seeded sections (realistic generator output)
// ---------------------------------------------------------------------------

const SEEDED_GROUPS: { title: string; cells: Cell[] }[] = [
  {
    title: "Rikishi — divisions (shaved → chonmage → ōichōmage → tsuna)",
    cells: [
      rikishi("jonokuchi", 0, { age: 18, division: "jonokuchi", weight: 110 }),
      rikishi("jonidan", 1, { age: 19, division: "jonidan", weight: 120 }),
      rikishi("sandanme", 2, { age: 20, division: "sandanme", weight: 135 }),
      rikishi("makushita", 3, { age: 22, division: "makushita", weight: 145 }),
      rikishi("juryo", 4, { age: 25, division: "juryo", rank: "juryo", weight: 155 }),
      rikishi("maegashira", 5, {
        age: 27,
        division: "makuuchi",
        rank: "maegashira",
        weight: 160,
      }),
      rikishi("yokozuna", 6, {
        age: 31,
        division: "makuuchi",
        rank: "yokozuna",
        weight: 180,
      }),
    ],
  },
  {
    title: "Nationalities (jūryō rikishi, age 25)",
    cells: NATS.map((nat, i) =>
      rikishi(nat, i, { age: 25, division: "juryo", rank: "juryo", weight: 150 }, nat)
    ),
  },
  {
    title: "Roles",
    cells: [
      {
        label: "prospect",
        gen: { seed: "sheet::role::0", nationality: "mongolia", role: "prospect" },
        stage: { role: "prospect", age: 17, weight: 85 },
      },
      {
        label: "oyakata · 60",
        gen: { seed: "sheet::role::1", nationality: "japan", role: "oyakata" },
        stage: { role: "oyakata", age: 60, weight: 150 },
      },
      {
        label: "oyakata · 72",
        gen: { seed: "sheet::role::2", nationality: "japan", role: "oyakata" },
        stage: { role: "oyakata", age: 72, weight: 140 },
      },
      {
        label: "gyōji · tate",
        gen: { seed: "sheet::role::3", nationality: "japan", role: "gyoji" },
        stage: { role: "gyoji", age: 55, gyojiRank: "tate" },
      },
      {
        label: "gyōji · sanyaku",
        gen: { seed: "sheet::role::4", nationality: "japan", role: "gyoji" },
        stage: { role: "gyoji", age: 45, gyojiRank: "sanyaku" },
      },
      {
        label: "gyōji · makushita",
        gen: { seed: "sheet::role::5", nationality: "japan", role: "gyoji" },
        stage: { role: "gyoji", age: 30, gyojiRank: "makushita" },
      },
      {
        label: "shimpan · 65",
        gen: { seed: "sheet::role::6", nationality: "japan", role: "shimpan" },
        stage: { role: "shimpan", age: 65 },
      },
      {
        label: "technique coach",
        gen: { seed: "sheet::role::7", nationality: "japan", role: "staff" },
        stage: { role: "staff", age: 45, staffRole: "technique_coach" },
      },
      {
        label: "medical staff",
        gen: { seed: "sheet::role::8", nationality: "japan", role: "staff" },
        stage: { role: "staff", age: 40, staffRole: "medical_staff" },
      },
      {
        label: "nutritionist",
        gen: { seed: "sheet::role::9", nationality: "japan", role: "staff" },
        stage: { role: "staff", age: 35, staffRole: "nutritionist" },
      },
      {
        label: "scout",
        gen: { seed: "sheet::role::10", nationality: "japan", role: "staff" },
        stage: { role: "staff", age: 50, staffRole: "scout" },
      },
      {
        label: "administrator",
        gen: { seed: "sheet::role::11", nationality: "japan", role: "staff" },
        stage: { role: "staff", age: 55, staffRole: "administrator" },
      },
    ],
  },
];

/** Seeded variety grid — broad sample of the combined feature space. */
const VARIETY_CELLS: Cell[] = Array.from({ length: 24 }, (_, i) => {
  const nat = NATS[i % NATS.length];
  const division = DIVISIONS[i % DIVISIONS.length];
  const age = 17 + ((i * 7) % 22); // 17–38
  const weight = 95 + ((i * 13) % 110); // 95–204
  const rank = division === "makuuchi" && i % 5 === 0 ? "yokozuna" : undefined;
  return rikishi(`v${String(i + 1).padStart(2, "0")}`, i + 100, {
    age,
    division,
    rank,
    weight,
    glasses: i % 11 === 0,
    injured: i % 13 === 0,
    aggression: (i * 29) % 100,
    momentum: (i * 37) % 100,
  }, nat);
});

// ---------------------------------------------------------------------------
// Feature-matrix sections (explicit coverage of every enum value)
// ---------------------------------------------------------------------------

export const BASE_IDENTITY: AvatarIdentity = {
  version: 2,
  seed: "matrix",
  role: "rikishi",
  headShape: "oval",
  eyes: "standard",
  brows: "straight",
  browThickness: 2,
  nose: "medium",
  mouth: "neutral",
  ears: "medium",
  skinTone: NATIONALITY_SKIN_TONES.japan.base,
  hairColor: HAIR_COLORS.black,
  mark: "none",
  facialHair: "none",
};

export const BASE_STAGE: AvatarStage = {
  role: "rikishi",
  ageStage: "prime",
  graying: 0,
  wrinkleTier: 0,
  hairstyle: "chonmage",
  fullness: 1,
  glasses: false,
  bandage: false,
  attire: "bare",
  tsuna: false,
  expression: "neutral",
};

export interface MatrixCell {
  label: string;
  id?: Partial<AvatarIdentity>;
  stage?: Partial<AvatarStage>;
}

export const MATRIX_GROUPS: { title: string; cells: MatrixCell[] }[] = [
  {
    title: "Head shapes",
    cells: (["full", "round", "oval", "square", "broad", "long"] as const).map((h) => ({
      label: h,
      id: { headShape: h },
    })),
  },
  {
    title: "Eyes",
    cells: (["standard", "narrow", "wide", "deepset", "upturned"] as const).map((e) => ({
      label: e,
      id: { eyes: e },
    })),
  },
  {
    title: "Brows (& thickness 1–3 on straight)",
    cells: [
      ...(["straight", "furrowed", "arched", "sparse"] as const).map((b) => ({
        label: b,
        id: { brows: b } as Partial<AvatarIdentity>,
      })),
      ...([1, 3] as const).map((t) => ({
        label: `thick ${t}`,
        id: { browThickness: t } as Partial<AvatarIdentity>,
      })),
    ],
  },
  {
    title: "Noses",
    cells: (["small", "medium", "broad", "flat", "hooked"] as const).map((n) => ({
      label: n,
      id: { nose: n },
    })),
  },
  {
    title: "Mouths",
    cells: (["neutral", "smile", "frown", "pursed", "open", "flat"] as const).map((m) => ({
      label: m,
      id: { mouth: m },
    })),
  },
  {
    title: "Ears",
    cells: (["small", "medium", "large", "cauliflower"] as const).map((e) => ({
      label: e,
      id: { ears: e },
    })),
  },
  {
    title: "Marks & facial hair",
    cells: [
      ...(["scar", "mole", "freckles", "acne"] as const).map((m) => ({
        label: m,
        id: { mark: m } as Partial<AvatarIdentity>,
      })),
      ...(["mustache", "goatee", "full"] as const).map((f) => ({
        label: f,
        id: { facialHair: f } as Partial<AvatarIdentity>,
      })),
    ],
  },
  {
    title: "Hairstyles",
    cells: (["shaved", "chonmage", "oichomage", "short", "receding", "bald"] as const).map(
      (h) => ({ label: h, stage: { hairstyle: h } })
    ),
  },
  {
    title: "Fullness (weight)",
    cells: ([0, 1, 2] as const).map((f) => ({
      label: `fullness ${f}`,
      stage: { fullness: f },
    })),
  },
  {
    title: "Graying & wrinkles",
    cells: [
      ...([0, 1, 2] as const).map((g) => ({
        label: `gray ${g}`,
        stage: { graying: g } as Partial<AvatarStage>,
      })),
      ...([1, 2, 3] as const).map((w) => ({
        label: `wrinkles ${w}`,
        stage: { wrinkleTier: w } as Partial<AvatarStage>,
      })),
    ],
  },
  {
    title: "Attires",
    cells: (
      [
        "bare",
        "kimono",
        "suit",
        "tracksuit",
        "coat",
        "polo",
        "shirt",
        "apron",
        "gyoji_tate",
        "gyoji_sanyaku",
        "gyoji_standard",
        "shimpan",
      ] as const
    ).map((a) => ({
      label: a.replace(/_/g, " "),
      stage: {
        attire: a,
        ...(a.startsWith("gyoji") ? { role: "gyoji" as const } : {}),
      },
    })),
  },
  {
    title: "Expressions",
    cells: (["neutral", "determined", "confident", "intense", "worried"] as const).map(
      (e) => ({ label: e, stage: { expression: e } })
    ),
  },
  {
    title: "Accessories & overrides",
    cells: [
      { label: "glasses", stage: { glasses: true } },
      { label: "bandage", stage: { bandage: true } },
      { label: "tsuna", stage: { tsuna: true, attire: "bare" } },
      { label: "glasses+bandage", stage: { glasses: true, bandage: true } },
      { label: "attire override", stage: { attireOverride: "#8a2f3c" } },
      { label: "backdrop override", stage: { backdropTone: "#4a3b2a" } },
    ],
  },
];

// ---------------------------------------------------------------------------
// Render helpers
// ---------------------------------------------------------------------------

function svgFromPaths(paths: Map<string, string>, px: number): string {
  const inner = [...paths.entries()]
    .map(([hex, d]) => `<path fill="${hex}" d="${d}"/>`)
    .join("");
  return `<svg viewBox="0 0 24 24" width="${px}" height="${px}" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
}

export function cellSvg(cell: Cell, px = 96): string {
  const identity = generateAvatarIdentity(cell.gen);
  const stage = deriveAvatarStage(cell.stage, identity);
  return svgFromPaths(composeAvatar(identity, stage), px);
}

function matrixSvg(cell: MatrixCell, px = 96): string {
  const identity: AvatarIdentity = { ...BASE_IDENTITY, ...cell.id };
  const stage: AvatarStage = { ...BASE_STAGE, ...cell.stage };
  return svgFromPaths(composeAvatar(identity, stage), px);
}

/** Representative slot colors for standalone sprite-part previews. */
const PART_SLOT_COLORS: Partial<Record<PaletteSlot, string>> = {
  hair: "#1a1a1a",
  hairGray: "#6b6b6b",
  ink: "#1a1a1a",
  white: "#ffffff",
  glass: "#a8c8e0",
  bandage: "#f3efe4",
};

function partSvg(runs: PixelRun[], px = 96): string {
  const byColor = new Map<string, string>();
  for (const r of runs) {
    const hex = PART_SLOT_COLORS[r.slot];
    if (!hex) continue;
    const piece = `M${r.x} ${r.y}h${r.len}v1H${r.x}z`;
    byColor.set(hex, (byColor.get(hex) ?? "") + piece);
  }
  const inner = [...byColor.entries()]
    .map(([hex, d]) => `<path fill="${hex}" d="${d}"/>`)
    .join("");
  return (
    `<svg viewBox="0 0 24 24" width="${px}" height="${px}" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">` +
    `<rect width="24" height="24" fill="#2a3444"/>${inner}</svg>`
  );
}

export const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

function toItems(title: string, labels: string[], svgs: string[]): SheetItem[] {
  return labels.map((label, i) => ({
    key: `${slug(title).slice(0, 24)}-${i}-${slug(label) || i}`,
    label,
    svg: svgs[i],
    kind: "avatar" as const,
  }));
}

export function buildSections(): SheetSection[] {
  const sections: SheetSection[] = [];

  for (const g of SEEDED_GROUPS) {
    sections.push({
      title: g.title,
      items: toItems(
        g.title,
        g.cells.map((c) => c.label),
        g.cells.map((c) => cellSvg(c))
      ),
    });
  }

  sections.push({
    title: "Variety (seeded)",
    items: toItems(
      "variety",
      VARIETY_CELLS.map((c) => c.label),
      VARIETY_CELLS.map((c) => cellSvg(c))
    ),
  });

  for (const g of MATRIX_GROUPS) {
    sections.push({
      title: g.title,
      items: toItems(
        g.title,
        g.cells.map((c) => c.label),
        g.cells.map((c) => matrixSvg(c))
      ),
    });
  }

  const parts: [string, PixelRun[]][] = [
    ["ōichōmage fan", OICHOMAGE_FAN],
    ["chonmage knot", CHONMAGE_KNOT],
    ["eboshi cap", EBOSHI_CAP],
    ["glasses frame", GLASSES_FRAME],
    ["tsuna rope", TSUNA_ROPE],
    ["bandage patch", BANDAGE_PATCH],
  ];
  sections.push({
    title: "Sprite parts (pixelAtlas)",
    items: parts.map(([label, runs], i) => ({
      key: `parts-${i}-${slug(label)}`,
      label,
      svg: partSvg(runs),
      kind: "part" as const,
    })),
  });

  return sections;
}

export const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function sheetHtml(
  title: string,
  sections: { title: string; items: { label: string; inner: string }[] }[]
): string {
  const body = sections
    .map(
      (s) => `
  <section>
    <h2>${esc(s.title)}</h2>
    <div class="row">
      ${s.items
        .map((it) => `<figure>${it.inner}<figcaption>${esc(it.label)}</figcaption></figure>`)
        .join("\n      ")}
    </div>
  </section>`
    )
    .join("\n");

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<title>${esc(title)}</title>
<style>
  body { margin: 0; background: #e9e6df; font-family: ui-monospace, Menlo, monospace; color: #222; }
  #sheet { display: inline-block; padding: 28px 32px; }
  h1 { font-size: 18px; margin: 0 0 18px; letter-spacing: 0.04em; }
  h2 { font-size: 11px; margin: 20px 0 8px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: #555; }
  .row { display: flex; flex-wrap: wrap; gap: 10px; }
  figure { margin: 0; display: flex; flex-direction: column; align-items: center; gap: 5px; }
  svg, img { display: block; border-radius: 4px; box-shadow: 0 0 0 1px rgba(0,0,0,0.12); }
  img { width: 96px; height: 96px; object-fit: cover; }
  figcaption { font-size: 9.5px; color: #444; text-align: center; max-width: 96px; }
</style>
</head>
<body>
<div id="sheet">
  <h1>${esc(title)}</h1>
  ${body}
</div>
</body>
</html>`;
}
