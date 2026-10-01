import { describe, it, expect, beforeAll } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { BardEngine } from "@/engine/bard/BardEngine";
import { rngFromSeed } from "@/engine/rng";

/**
 * Template-integrity guard for bard domain JSONs touched by content PRs.
 *
 * For every template path modified in the consolidation, resolve it through
 * BardEngine with the SAME context keys the production call site supplies,
 * across many seeds (covering every entry), and assert:
 *   - the JSON parses,
 *   - resolution never returns an empty/[MISSING:] result,
 *   - no unresolved %TOKEN% leaks into output.
 */

const DOMAINS_DIR = join(__dirname, "../../../../engine/bard/domains");

/** path → context keys matching the production resolve() call site. */
const TOUCHED_PATHS: { path: string; context: Record<string, string> }[] = [
  // PR #1022 — boutNarrative.ts:2198 supplies {LOSER, STREAK}
  { path: "post_bout.storylines.loss_streak", context: { LOSER: "Testoyama", STREAK: "4" } },
  // PR #1003 — boutNarrative.ts:1916 supplies {WINNER, LOSER, KIMARITE}
  { path: "post_bout.reaction", context: { WINNER: "Hoshoryu", LOSER: "Testoyama", KIMARITE: "yorikiri" } },
  // PR #1011 — boutNarrative.ts:819 supplies {SHIKONA, HEYA_NAME}
  { path: "pre_bout.heya_style.defensive", context: { SHIKONA: "Testoyama", HEYA_NAME: "Miyagino" } },
  { path: "pre_bout.heya_style.hybrid", context: { SHIKONA: "Testoyama", HEYA_NAME: "Miyagino" } },
  { path: "pre_bout.heya_style.trickster", context: { SHIKONA: "Testoyama", HEYA_NAME: "Miyagino" } },
  { path: "pre_bout.heya_style.giant", context: { SHIKONA: "Testoyama", HEYA_NAME: "Miyagino" } },
  // PR #1001 — generateKyujoNarrative supplies {SHIKONA, AREA, DAY, REASON, BASHOS_MISSED}
  {
    path: "kyujo.return_from_kyujo",
    context: { SHIKONA: "Testoyama", AREA: "leg", DAY: "1", REASON: "injury", BASHOS_MISSED: "2" },
  },
  // PR #1008 — PostBashoPressService.ts:194/210 supplies {SHIKONA}
  { path: "post_basho_press.champion.diary", context: { SHIKONA: "Testoyama" } },
  { path: "post_basho_press.champion.superstition", context: { SHIKONA: "Testoyama" } },
  // PR #1020 — venues closing (NOTE: no production call site resolves .closing;
  // the path is content-only today — see consolidation-verdict-v8.md)
  { path: "world.venues.Tokyo.closing", context: { DAY: "5" } },
  { path: "world.venues.Osaka.closing", context: { DAY: "5" } },
  { path: "world.venues.Nagoya.closing", context: { DAY: "5" } },
  { path: "world.venues.Fukuoka.closing", context: { DAY: "5" } },
  // PR #1034 — boutNarrative.ts replay block supplies {WINNER, LOSER, KIMARITE}
  { path: "post_bout.replay.size_overcame", context: { WINNER: "Hoshoryu", LOSER: "Testoyama", KIMARITE: "yorikiri" } },
  { path: "post_bout.replay.quick_finish", context: { WINNER: "Hoshoryu", LOSER: "Testoyama", KIMARITE: "oshidashi" } },
  { path: "post_bout.replay.control", context: { WINNER: "Hoshoryu", LOSER: "Testoyama", KIMARITE: "yorikiri" } },
];

const SEEDS = 80;

describe("bard domain template token integrity", () => {
  const files = readdirSync(DOMAINS_DIR).filter((f) => f.endsWith(".json"));
  expect(files.length).toBeGreaterThan(0);

  beforeAll(async () => {
    await BardEngine.loadDomains();
  });

  for (const file of files) {
    it(`${file}: parses as valid JSON`, () => {
      expect(() => JSON.parse(readFileSync(join(DOMAINS_DIR, file), "utf-8"))).not.toThrow();
    });
  }

  for (const { path, context } of TOUCHED_PATHS) {
    it(`${path} resolves with no unresolved tokens across ${SEEDS} seeds`, () => {
      const unresolved: string[] = [];
      const missing: string[] = [];
      for (let i = 0; i < SEEDS; i++) {
        const rng = rngFromSeed(`token-integrity-${i}`, "test", path);
        const res = BardEngine.resolve(rng, path, context);
        if (!res.text || res.text.includes("[MISSING:")) {
          missing.push(`seed ${i}: ${res.text}`);
        } else if (/%[A-Z_]+%/.test(res.text)) {
          unresolved.push(`seed ${i}: ${res.text}`);
        }
      }
      expect(missing, "unresolved/missing template").toEqual([]);
      expect(unresolved, "tokens leaked into output").toEqual([]);
    });
  }
});
