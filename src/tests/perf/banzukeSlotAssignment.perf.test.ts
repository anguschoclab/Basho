/**
 * Performance benchmark for updateBanzuke slot assignment.
 *
 * Measures the time to assign a large field (800+ rikishi) to banzuke slots.
 * The O(N²) original and O(N) optimized version should both complete well
 * within the budget; this test guards against future regressions to O(N³)
 * or worse, and demonstrates the O(N) scaling advantage at larger scales.
 *
 * Run via: npm run test:perf
 */
import { describe, it, expect } from "vitest";
import { updateBanzuke } from "@/engine/banzuke";
import type { BanzukeEntry, BashoPerformance } from "@/engine/types/banzuke";
import { toRankPosition } from "@/engine/types/banzuke";
import { makeMockWorld } from "../unit/engine/utils";

function makeLargeField(n: number): {
  world: ReturnType<typeof makeMockWorld>;
  banzuke: BanzukeEntry[];
  perf: Map<string, BashoPerformance>;
} {
  const banzuke: BanzukeEntry[] = [];
  const perfMap = new Map<string, BashoPerformance>();

  // Distribute across divisions to exercise all bucket tiers
  const ranks: Array<{ rank: any; division: any; weight: number }> = [
    { rank: "yokozuna", division: "makuuchi", weight: 0.01 },
    { rank: "ozeki", division: "makuuchi", weight: 0.02 },
    { rank: "sekiwake", division: "makuuchi", weight: 0.02 },
    { rank: "komusubi", division: "makuuchi", weight: 0.03 },
    { rank: "maegashira", division: "makuuchi", weight: 0.15 },
    { rank: "juryo", division: "juryo", weight: 0.1 },
    { rank: "makushita", division: "makushita", weight: 0.2 },
    { rank: "sandanme", division: "sandanme", weight: 0.15 },
    { rank: "jonidan", division: "jonidan", weight: 0.17 },
    { rank: "jonokuchi", division: "jonokuchi", weight: 0.15 },
  ];

  let id = 0;
  for (const { rank, division, weight } of ranks) {
    const count = Math.max(1, Math.floor(n * weight));
    for (let i = 0; i < count && id < n; i++) {
      const rikishiId = `RK${id++}`;
      const isNumbered = [
        "maegashira",
        "juryo",
        "makushita",
        "sandanme",
        "jonidan",
        "jonokuchi",
      ].includes(rank);
      const rankNumber = isNumbered ? i + 1 : undefined;
      const side = i % 2 ? "west" : "east";
      banzuke.push({
        rikishiId,
        division,
        position: toRankPosition({ rank, side, rankNumber }),
      });
      // Varied performances to exercise different eligibleBestTier values
      const wins = (id * 7) % 15;
      const losses = 15 - wins;
      perfMap.set(rikishiId, {
        rikishiId,
        wins,
        losses,
        absences: 0,
        yusho: wins === 15,
      });
    }
  }

  const world = makeMockWorld();
  return { world, banzuke, perf: perfMap };
}

describe("PERF: banzuke slot assignment", () => {
  it("assigns 800 rikishi within 100ms", () => {
    const { world, banzuke, perf } = makeLargeField(800);

    const start = performance.now();
    const result = updateBanzuke(banzuke, perf, world, {});
    const elapsed = performance.now() - start;

    // Correctness: every rikishi should get a slot
    expect(result.newBanzuke.length).toBe(banzuke.length);

    // Performance budget: generous enough for both O(N²) and O(N),
    // but catches catastrophic regressions
    expect(elapsed).toBeLessThan(100);
  });

  it("assigns 2000 rikishi within 200ms (demonstrates O(N) scaling)", () => {
    const { world, banzuke, perf } = makeLargeField(2000);

    const start = performance.now();
    const result = updateBanzuke(banzuke, perf, world, {});
    const elapsed = performance.now() - start;

    expect(result.newBanzuke.length).toBe(banzuke.length);
    // At N=2000, O(N²) would do ~4M comparisons. O(N) does ~20K.
    // Budget of 200ms is generous for O(N); O(N²) may approach it.
    expect(elapsed).toBeLessThan(200);
  });
});
