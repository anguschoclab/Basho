/**
 * npcFog.audit.test.ts
 * =====================
 * Fog-of-war symmetry invariant: no agent *decision* and no *player surface*
 * may read hidden talent truth. Hidden fields: `talentSeed`, `potentialStats`,
 * `potential.*` (the PA block). What IS allowed:
 *
 *   - `perceivedTalentSeed` / `perceivedCA` / `perceivedPA` — the fog channel,
 *     keyed to the observing heya (player's UI keys to the player heyaId, so
 *     player and NPC read through the identical noisy lens).
 *   - Current `stats.*` — on-track performance is observable reality (you can
 *     watch the bouts); potential is what must stay hidden.
 *   - Keep-truth engine mechanics: training ceilings, weight targets, fame
 *     events, cup seeding — world physics, not agent decisions. All live in
 *     engine/{training,generation,economy} — OUTSIDE the audited dirs.
 *
 * Scanned patterns are property ACCESS only (`.talentSeed`), so identifiers
 * like `perceivedTalentSeed`, comments, and type members don't match.
 */
import { describe, it, expect } from "vitest";
import { join } from "path";
import { readFileSync } from "fs";
import { findFiles, SRC, normalizePathSlashes } from "@tests/helpers/fsScan";

const AUDITED_DIRS = [
  join(SRC, "engine", "npc"),
  join(SRC, "presenters"),
  join(SRC, "components"),
];

// Hidden-truth property reads — agent decisions and UI must go through the
// fog channel (perceived*) instead.
const FORBIDDEN = [/\.talentSeed\b/, /\.potentialStats\b/, /\.potential\s*[.?]/];

const ALLOWLIST = new Set<string>([
  // None inside audited scope — keep-truth engine mechanics live elsewhere.
]);

function violations(): string[] {
  const hits: string[] = [];
  for (const dir of AUDITED_DIRS) {
    for (const file of findFiles(dir, { exclude: /\.(test|spec)\.|\.d\.ts$/ })) {
      const rel = normalizePathSlashes(file);
      if (ALLOWLIST.has(rel)) continue;
      const src = readFileSync(file, "utf8");
      const lines = src.split("\n");
      lines.forEach((line, i) => {
        for (const re of FORBIDDEN) {
          if (re.test(line)) {
            hits.push(`${rel}:${i + 1}  ${line.trim().slice(0, 100)}`);
            break;
          }
        }
      });
    }
  }
  return hits;
}

describe("NPC-fog audit — hidden talent truth never reaches agent decisions or UI", () => {
  it("no .talentSeed / .potentialStats / .potential. reads in npc/**, presenters/**, components/**", () => {
    expect(violations()).toEqual([]);
  });
});
