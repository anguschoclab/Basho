import { describe, it, expect } from "vitest";
import { bestTierAllowed } from "@/engine/banzuke/promotionLogic";
import type { BanzukeEntry, BashoPerformance } from "@/engine/types/banzuke";

function entry(
  rank: "sekiwake" | "komusubi" | "ozeki",
  id: string = "r1",
): BanzukeEntry {
  return {
    rikishiId: id,
    position: { rank, side: "east" } as BanzukeEntry["position"],
    division: "makuuchi",
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

// ── bestTierAllowed: 33-win Ozeki promotion tests ───────────────────────────

describe("Ozeki promotion — 33-win criteria (bestTierAllowed)", () => {
  it("sekiwake with 10 wins and 33 total → tier 2 (ozeki promotion)", () => {
    const result = bestTierAllowed(
      entry("sekiwake"),
      perf(10, 5, { sekiwakeThreeBashoWins: 33 }),
      undefined,
      NONE,
    );
    expect(result).toBe(2);
  });

  it("sekiwake with 10 wins and 34 total → tier 2", () => {
    const result = bestTierAllowed(
      entry("sekiwake"),
      perf(10, 5, { sekiwakeThreeBashoWins: 34 }),
      undefined,
      NONE,
    );
    expect(result).toBe(2);
  });

  it("sekiwake with 9 wins and 33 total → tier 3 (last basho must be 10+)", () => {
    const result = bestTierAllowed(
      entry("sekiwake"),
      perf(9, 6, { sekiwakeThreeBashoWins: 33 }),
      undefined,
      NONE,
    );
    expect(result).toBe(3);
  });

  it("sekiwake with 10 wins and 32 total → tier 3 (not enough total)", () => {
    const result = bestTierAllowed(
      entry("sekiwake"),
      perf(10, 5, { sekiwakeThreeBashoWins: 32 }),
      undefined,
      NONE,
    );
    expect(result).toBe(3);
  });

  it("sekiwake with 11 wins and 33 total → tier 2 (both paths give tier 2)", () => {
    const result = bestTierAllowed(
      entry("sekiwake"),
      perf(11, 4, { sekiwakeThreeBashoWins: 33 }),
      undefined,
      NONE,
    );
    expect(result).toBe(2);
  });

  it("sekiwake with 10 wins and no sekiwakeThreeBashoWins → tier 3", () => {
    const result = bestTierAllowed(
      entry("sekiwake"),
      perf(10, 5),
      undefined,
      NONE,
    );
    expect(result).toBe(3);
  });
});

// ── promoteToOzeki detection logic tests ────────────────────────────────────

describe("Ozeki promotion — 33-win detection logic", () => {
  it("12+12+10 = 34 total with 10 in last → should promote", () => {
    const prevWins = [12, 12]; // last 2 basho
    const currentWins = 10;
    const total = prevWins.reduce((a, b) => a + b, 0) + currentWins;
    const shouldPromote = total >= 33 && currentWins >= 10;
    expect(shouldPromote).toBe(true);
  });

  it("11+11+11 = 33 total with 11 in last → should promote", () => {
    const prevWins = [11, 11];
    const currentWins = 11;
    const total = prevWins.reduce((a, b) => a + b, 0) + currentWins;
    const shouldPromote = total >= 33 && currentWins >= 10;
    expect(shouldPromote).toBe(true);
  });

  it("12+12+9 = 33 total with 9 in last → should NOT promote (last < 10)", () => {
    const prevWins = [12, 12];
    const currentWins = 9;
    const total = prevWins.reduce((a, b) => a + b, 0) + currentWins;
    const shouldPromote = total >= 33 && currentWins >= 10;
    expect(shouldPromote).toBe(false);
  });

  it("10+10+10 = 30 total → should NOT promote (total < 33)", () => {
    const prevWins = [10, 10];
    const currentWins = 10;
    const total = prevWins.reduce((a, b) => a + b, 0) + currentWins;
    const shouldPromote = total >= 33 && currentWins >= 10;
    expect(shouldPromote).toBe(false);
  });

  it("13+10+10 = 33 total with 10 in last → should promote", () => {
    const prevWins = [13, 10];
    const currentWins = 10;
    const total = prevWins.reduce((a, b) => a + b, 0) + currentWins;
    const shouldPromote = total >= 33 && currentWins >= 10;
    expect(shouldPromote).toBe(true);
  });
});
