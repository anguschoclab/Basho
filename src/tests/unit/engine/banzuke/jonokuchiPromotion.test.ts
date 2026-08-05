import { describe, it, expect } from "vitest";
import { bestTierAllowed } from "@/engine/banzuke/promotionLogic";
import type { BanzukeEntry, BashoPerformance } from "@/engine/types/banzuke";

function jonokuchiEntry(id: string = "r1"): BanzukeEntry {
  return {
    rikishiId: id,
    position: { rank: "jonokuchi", rankNumber: 1, side: "east" } as BanzukeEntry["position"],
    division: "jonokuchi",
  };
}

function perf(
  wins: number,
  losses: number,
  extras: Partial<BashoPerformance> = {},
): BashoPerformance {
  return { rikishiId: "r1", wins, losses, ...extras };
}

const NONE = new Set<string>();

// Jonokuchi tier = 10, Jonidan tier = 9, Sandanme tier = 8, Makushita tier = 7

describe("Jonokuchi special promotion (bestTierAllowed)", () => {
  it("7-0 yusho at jonokuchi → tier 8 (can reach sandanme)", () => {
    const result = bestTierAllowed(
      jonokuchiEntry(),
      perf(7, 0, { yusho: true }),
      undefined,
      NONE,
    );
    expect(result).toBeLessThanOrEqual(8);
  });

  it("6-1 yusho at jonokuchi → tier 8 (can reach sandanme)", () => {
    const result = bestTierAllowed(
      jonokuchiEntry(),
      perf(6, 1, { yusho: true }),
      undefined,
      NONE,
    );
    expect(result).toBeLessThanOrEqual(8);
  });

  it("5-2 kachi-koshi at jonokuchi (no yusho) → tier 9 (can reach jonidan)", () => {
    const result = bestTierAllowed(
      jonokuchiEntry(),
      perf(5, 2),
      undefined,
      NONE,
    );
    expect(result).toBeLessThanOrEqual(9);
  });

  it("4-3 kachi-koshi at jonokuchi → tier 9 (can reach jonidan)", () => {
    const result = bestTierAllowed(
      jonokuchiEntry(),
      perf(4, 3),
      undefined,
      NONE,
    );
    expect(result).toBeLessThanOrEqual(9);
  });

  it("3-4 make-koshi at jonokuchi → tier 10 (stays in jonokuchi)", () => {
    const result = bestTierAllowed(
      jonokuchiEntry(),
      perf(3, 4),
      undefined,
      NONE,
    );
    expect(result).toBe(10);
  });

  it("0-7 at jonokuchi → tier 10 (stays in jonokuchi)", () => {
    const result = bestTierAllowed(
      jonokuchiEntry(),
      perf(0, 7),
      undefined,
      NONE,
    );
    expect(result).toBe(10);
  });
});
