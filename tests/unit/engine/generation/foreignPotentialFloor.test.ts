/**
 * Spec (RED) — foreign selection funnel carries sekitori-calibre potential.
 *
 * Measured finding (probe-sekitori-trajectory, 16 sim-years): zero organic
 * foreign debutants reached sekitori while 77 domestic debutants did. Root:
 * the foreign PA floor sits at juryo-mean 58 — survivors develop into
 * makushita-ceiling careers (journeyman profile caps at 43), so the pipeline
 * replenishes lower divisions but never the sekitori ranks. Real-world
 * foreign recruits are the selected amateur tail — ~23% of sekitori are
 * foreign on ~5% of the roster, so per-capita conversion is far above
 * domestic. The floor must model proven-amateur survivors, not average
 * juryo prospects: at least maegashira-mean potential (~64).
 */
import { describe, it, expect } from "vitest";
import { generateCandidate } from "@/engine/generation/CandidateGenerator";
import { rngFromSeed } from "@/engine/core/rng";
import { PA_BY_RANK } from "@/constants/engine/development";
import type { TalentCandidate } from "@/engine/types/talent";

const YEAR = 2030;
const SAMPLE = 60;

function foreignPool(): TalentCandidate[] {
  const rng = rngFromSeed("foreign-funnel-spec");
  const out: TalentCandidate[] = [];
  for (let i = 0; i < SAMPLE; i++) {
    out.push(
      generateCandidate({ id: `f-${i}`, rng, currentYear: YEAR, poolType: "foreign" })
    );
  }
  return out;
}

const PA_KEYS = [
  "power",
  "speed",
  "technique",
  "balance",
  "stamina",
  "mental",
  "adaptability",
] as const;

describe("foreign candidate potential floor", () => {
  it("every survivor's floor is at least makuuchi-prospect calibre", () => {
    // The funnel floor must clear the makushita stall band — anchored at
    // maegashira-mean potential (real funnel survivors are sekitori-grade).
    const floor = PA_BY_RANK.maegashira.mean;
    for (const c of foreignPool()) {
      for (const key of PA_KEYS) {
        expect(
          c.potentialStats[key],
          `${c.candidateId}.${key}=${c.potentialStats[key]} below makuuchi-prospect floor ${floor}`
        ).toBeGreaterThanOrEqual(floor);
      }
    }
  });

  it("domestic pool is untouched — foreigners alone carry the funnel floor", () => {
    const rng = rngFromSeed("domestic-control-spec");
    let minSeen = 200;
    for (let i = 0; i < SAMPLE; i++) {
      const c = generateCandidate({
        id: `d-${i}`,
        rng,
        currentYear: YEAR,
        poolType: "highschool",
      });
      for (const key of PA_KEYS) minSeen = Math.min(minSeen, c.potentialStats[key]);
    }
    // Guard: domestic candidates still roll the raw jonokuchi distribution —
    // some must fall below the foreign floor or the floor leaked.
    expect(minSeen).toBeLessThan(PA_BY_RANK.maegashira.mean);
  });
});
