import { describe, it, expect } from "vitest";
import { generateCandidate } from "@/engine/generation/CandidateGenerator";
import { rngFromSeed } from "@/engine/core/rng";
import { PA_BY_RANK } from "@/constants/engine/development";
import type { TalentCandidate } from "@/engine/types/talent";

// ---------------------------------------------------------------------------
// Shared root fix — candidate elite-ceiling tail (measured, probe-sanyaku-tenure)
//
// Measured findings (6 sim-years + 400-candidate sample):
//   - top-10 makuuchi PA spread p10=43 / p50=48.8 / p90=67.5
//   - only 5 careers ever reached a 3-basho sanyaku window
//   - candidate pool: 79/400 ≥58, 16/400 ≥64, **0/400 ≥72**
// The fat-tail roll supplies juryo/maegashira material but NEVER sanyaku
// calibre — the elite tiers the S/K ranks need staffing by cannot spawn.
// ---------------------------------------------------------------------------

const YEAR = 2030;
const SAMPLE = 400;

function domesticPool(seed = "ceiling-mixture-spec"): TalentCandidate[] {
  const rng = rngFromSeed(seed, "generation", "test");
  const out: TalentCandidate[] = [];
  for (let i = 0; i < SAMPLE; i++) {
    out.push(
      generateCandidate({
        id: `c-${i}`,
        rng,
        currentYear: YEAR,
        poolType: "high_school",
      })
    );
  }
  return out;
}

function meanPA(c: TalentCandidate): number {
  const ps = c.potentialStats;
  if (!ps) return 0;
  const keys = [
    "power",
    "speed",
    "technique",
    "balance",
    "stamina",
    "mental",
    "adaptability",
  ] as const;
  let sum = 0;
  for (const k of keys) sum += ps[k];
  return sum / keys.length;
}

describe("candidate elite-ceiling tail — sanyaku-calibre potential can spawn", () => {
  it("at least one recruit in the cohort carries a sanyaku-calibre ceiling", () => {
    const sanyakuMean = PA_BY_RANK.komusubi.mean; // 72
    const tail = domesticPool().filter((c) => meanPA(c) >= sanyakuMean);
    // Measured: 0/400 under the jonokuchi-centred roll. The elite tail must
    // produce ≥1 sanyaku-calibre recruit per cohort — real pools do.
    expect(
      tail.length,
      `0/${SAMPLE} candidates carried sanyaku-calibre ceilings — elite potential never spawns`
    ).toBeGreaterThanOrEqual(1);
  });

  it("the bulk still centers low — the mixture does not flood the top", () => {
    const pool = domesticPool();
    const means = pool.map(meanPA).sort((a, b) => a - b);
    const median = means[Math.floor(means.length / 2)];
    // Median recruit remains lower-division material (below makushita mean).
    expect(median).toBeLessThan(PA_BY_RANK.makushita.mean);
  });
});
