import { describe, it, expect } from "vitest";
import { computeMovementUnits } from "@/engine/banzuke/promotionLogic";
import type { BanzukeEntry, BashoPerformance } from "@/engine/types/banzuke";

function makushitaEntry(rankNumber: number, id: string = "r1"): BanzukeEntry {
  return {
    rikishiId: id,
    position: { rank: "makushita", rankNumber, side: "east" } as BanzukeEntry["position"],
    division: "makushita",
  };
}

function perf(
  wins: number,
  losses: number,
  extras: Partial<BashoPerformance> = {}
): BashoPerformance {
  return { rikishiId: "r1", wins, losses, ...extras };
}

const NONE = new Set<string>();

// Makushita threshold = 4 (7-bout division, kachi-koshi = 4)

describe("Makushita rank-dependent promotion (computeMovementUnits)", () => {
  it("5-2 at Makushita 1 → more movement than 5-2 at Makushita 50", () => {
    const topMove = computeMovementUnits(makushitaEntry(1), perf(5, 2), NONE);
    const bottomMove = computeMovementUnits(makushitaEntry(50), perf(5, 2), NONE);
    expect(topMove).toBeGreaterThan(bottomMove);
  });

  it("5-2 at Makushita 50 → less movement than 5-2 at Makushita 1", () => {
    const bottomMove = computeMovementUnits(makushitaEntry(50), perf(5, 2), NONE);
    const topMove = computeMovementUnits(makushitaEntry(1), perf(5, 2), NONE);
    expect(bottomMove).toBeLessThan(topMove);
  });

  it("4-3 at Makushita 1 → minimal or zero downward movement (near top, kachi-koshi)", () => {
    const move = computeMovementUnits(makushitaEntry(1), perf(4, 3), NONE);
    // 4-3 is kachi-koshi (threshold 4), so base move = 0, with top multiplier should be >= 0
    expect(move).toBeGreaterThanOrEqual(0);
  });

  it("7-0 at Makushita 1 → large upward movement (juryo promotion candidate)", () => {
    const move = computeMovementUnits(makushitaEntry(1), perf(7, 0, { yusho: true }), NONE);
    // 7-0 = zensho yusho, base = 7-4 = 3 + yusho bonus 5 = 8, with top multiplier 1.5x = 12
    expect(move).toBeGreaterThan(8);
  });

  it("7-0 at Makushita 60 → smaller movement than 7-0 at Makushita 1", () => {
    const topMove = computeMovementUnits(makushitaEntry(1), perf(7, 0, { yusho: true }), NONE);
    const bottomMove = computeMovementUnits(makushitaEntry(60), perf(7, 0, { yusho: true }), NONE);
    expect(topMove).toBeGreaterThan(bottomMove);
  });

  it("3-4 at Makushita 1 → less negative than 3-4 at Makushita 60", () => {
    const topMove = computeMovementUnits(makushitaEntry(1), perf(3, 4), NONE);
    const bottomMove = computeMovementUnits(makushitaEntry(60), perf(3, 4), NONE);
    // Top-ranked should have less severe demotion (closer to zero)
    expect(topMove).toBeGreaterThan(bottomMove);
  });
});
