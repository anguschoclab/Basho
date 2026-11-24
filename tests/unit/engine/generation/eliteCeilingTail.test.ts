import { describe, it, expect } from "vitest";
import { rollCeilingRank } from "@/engine/generation/CandidateStats";
import {
  ELITE_CEILING_TAIL_CHANCE,
  ELITE_CEILING_TIERS,
  PA_BY_RANK,
} from "@/constants/engine/development";
import { SeededRNG } from "@/engine/core/rng";

/**
 * C1 — yokozuna-tier PA must be reachable. Measured (14-yr probe): elite CA
 * compressed to ~62–74 against median ~55 (spread 19→6.7) because
 * ELITE_CEILING_TIERS stopped at ozeki — no recruit could ever roll the
 * yokozuna ceiling row (mean 88). Realization is fine (primePA90 ≈ 3/3);
 * the ceiling itself was capped one tier short of dominance.
 */
describe("elite ceiling tail — yokozuna tier", () => {
  it("ELITE_CEILING_TIERS includes a yokozuna row", () => {
    const yoko = ELITE_CEILING_TIERS.find(([rank]) => rank === "yokozuna");
    expect(yoko, "tail must reach the yokozuna PA tier").toBeDefined();
    expect(yoko![1]).toBeGreaterThan(0);
    // Sanity: tier weights stay a probability distribution over elite rolls.
    const total = ELITE_CEILING_TIERS.reduce((s, [, w]) => s + w, 0);
    expect(total).toBeCloseTo(1, 5);
  });

  it("rollCeilingRank reaches the yokozuna tier over the long run", () => {
    const counts = new Map<string, number>();
    const N = 20000;
    for (let i = 0; i < N; i++) {
      const rank = rollCeilingRank(new SeededRNG(`ceiling-${i}`));
      counts.set(rank, (counts.get(rank) ?? 0) + 1);
    }
    expect(counts.get("yokozuna") ?? 0, `0/${N} yokozuna ceilings rolled`).toBeGreaterThanOrEqual(1);
    expect(counts.get("ozeki") ?? 0).toBeGreaterThanOrEqual(1);
    // And the tail still means something — most rolls stay jonokuchi.
    expect(counts.get("jonokuchi") ?? 0).toBeGreaterThan(N * 0.9);
    // The drawn tier must actually map to a defined PA row.
    expect(PA_BY_RANK["yokozuna"].mean).toBeGreaterThanOrEqual(85);
  });
});
