/**
 * src/engine/__tests__/banzuke/promotionLogic.test.ts
 * ====================================================
 * Tests for banzuke movement and ozeki status logic.
 *
 * kachiKoshiThreshold for all sekitori ranks = floor(15/2)+1 = 8
 * Movement ceilings by rank:
 *   yokozuna  → ±2
 *   ozeki     → 0.65× damped, ±4 (demoted: min(-6, damped-4))
 *   sekiwake/komusubi → 0.8× damped, ±8
 *   maegashira (makuuchi) → raw, -18..+15  (lower divisions: -30..+25)
 */

import { describe, it, expect } from "vitest";
import { computeMovementUnits, bestTierAllowed } from "@/engine/banzuke/promotionLogic";
import { getOzekiStatus } from "@/engine/banzuke/ozekiLogic";
import type { BanzukeEntry, BashoPerformance } from "@/engine/types/banzuke";

// ── Helpers ────────────────────────────────────────────────────────────────

function entry(
  rank: "yokozuna" | "ozeki" | "sekiwake" | "komusubi",
  rankNumber?: never
): BanzukeEntry;
function entry(rank: "maegashira" | "juryo", rankNumber: number): BanzukeEntry;
function entry(rank: string, rankNumber?: number): BanzukeEntry {
  return {
    rikishiId: "r1",
    position:
      rankNumber !== undefined
        ? ({ rank, rankNumber, side: "east" } as BanzukeEntry["position"])
        : ({ rank, side: "east" } as BanzukeEntry["position"]),
    division: "makuuchi",
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

// ── computeMovementUnits ───────────────────────────────────────────────────

describe("computeMovementUnits — maegashira (threshold = 8)", () => {
  it("returns 0 at exactly kachi-koshi (8 wins)", () => {
    expect(computeMovementUnits(entry("maegashira", 5), perf(8, 7), NONE)).toBe(0);
  });

  it("returns +2 for 10 wins", () => {
    expect(computeMovementUnits(entry("maegashira", 5), perf(10, 5), NONE)).toBe(2);
  });

  it("returns -8 for 0 wins", () => {
    expect(computeMovementUnits(entry("maegashira", 5), perf(0, 15), NONE)).toBe(-8);
  });

  it("clamps to +15 maximum (makuuchi)", () => {
    // raw = 15 - 8 + yusho(5) + kinboshi(3) + specialPrizes(3) = 18 -> clamped to +15
    const move = computeMovementUnits(
      entry("maegashira", 5),
      perf(15, 0, { yusho: true, kinboshi: 3, specialPrizes: 3 }),
      NONE
    );
    expect(move).toBe(15);
  });

  it("clamps to -10 minimum", () => {
    const move = computeMovementUnits(entry("maegashira", 5), perf(0, 15), NONE);
    expect(move).toBeGreaterThanOrEqual(-10);
  });

  it("returns 0 when perf is undefined", () => {
    expect(computeMovementUnits(entry("maegashira", 5), undefined, NONE)).toBe(0);
  });

  it("applies absence penalty: 1 absence = light kyujo, 15 absences = heavy kyujo", () => {
    const perf1 = perf(8, 6, { absences: 1 });
    expect(computeMovementUnits(entry("maegashira", 5), perf1, NONE)).toBe(-1);

    const perf2 = perf(0, 0, { absences: 15 });
    expect(computeMovementUnits(entry("maegashira", 5), perf2, NONE)).toBe(-30);
  });

  it("adds yusho and kinboshi bonuses (14 wins, yusho, 2 kinboshi → +13)", () => {
    const move = computeMovementUnits(
      entry("maegashira", 1),
      perf(14, 1, { yusho: true, kinboshi: 2 }),
      NONE
    );
    expect(move).toBe(13);
  });

  it("incorporates opponentAvgTier into bonus (harder schedule = more movement)", () => {
    const perfHard = perf(8, 7, { opponentAvgTier: 2 });
    expect(computeMovementUnits(entry("maegashira", 15), perfHard, NONE)).toBe(1);

    const perfEasy = perf(8, 7, { opponentAvgTier: 6 });
    expect(computeMovementUnits(entry("maegashira", 15), perfEasy, NONE)).toBe(0);
  });

  it("handles junYusho and specialPrizes bonuses (8 wins, junYusho, 2 prizes → +4)", () => {
    const move = computeMovementUnits(
      entry("maegashira", 15),
      perf(8, 7, { junYusho: true, specialPrizes: 2 }),
      NONE
    );
    expect(move).toBe(4);
  });
});

describe("computeMovementUnits — yokozuna (±2 ceiling)", () => {
  it("clamps positive movement to +2", () => {
    const move = computeMovementUnits(entry("yokozuna"), perf(14, 1, { yusho: true }), NONE);
    expect(move).toBe(2);
  });

  it("clamps negative movement to -2", () => {
    const move = computeMovementUnits(entry("yokozuna"), perf(4, 11), NONE);
    expect(move).toBe(-2);
  });
});

describe("computeMovementUnits — ozeki (0.65× damped, ±4)", () => {
  it("damps movement by 0.65: 10 wins → +1", () => {
    // base = 10-8 = 2, damped = round(2 * 0.65) = round(1.3) = 1
    expect(computeMovementUnits(entry("ozeki"), perf(10, 5), NONE)).toBe(1);
  });

  it("clamps positive movement to +4", () => {
    const move = computeMovementUnits(entry("ozeki"), perf(14, 1, { yusho: true }), NONE);
    expect(move).toBe(4);
  });

  it("applies harsh penalty (≤ -6) when rikishi is in demotedOzeki set", () => {
    // 7 wins (make-koshi): base = 7-8 = -1, damped = round(-0.65) = -1
    // demoted: min(-6, -1-4) = min(-6, -5) = -6
    const demoted = new Set(["r1"]);
    expect(computeMovementUnits(entry("ozeki"), perf(7, 8), demoted)).toBeLessThanOrEqual(-6);
  });

  it("does not apply demotion penalty when rikishi is NOT in demotedOzeki", () => {
    const move = computeMovementUnits(entry("ozeki"), perf(7, 8), NONE);
    expect(move).toBeGreaterThan(-6);
  });
});

describe("computeMovementUnits — sekiwake/komusubi (0.8× damped, ±8)", () => {
  it("damps movement by 0.8 for sekiwake: 10 wins → +2", () => {
    // base = 10-8 = 2, scaled = round(2 * 0.8) = round(1.6) = 2
    expect(computeMovementUnits(entry("sekiwake"), perf(10, 5), NONE)).toBe(2);
  });

  it("clamps sekiwake positive movement to +8", () => {
    // raw scaled = round((15 - 8 + yusho(5)) * 0.8) = round(9.6) = 10 -> clamped to +8
    const move = computeMovementUnits(entry("sekiwake"), perf(15, 0, { yusho: true }), NONE);
    expect(move).toBe(8);
  });

  it("clamps sekiwake negative movement to -6", () => {
    const move = computeMovementUnits(entry("sekiwake"), perf(0, 15), NONE);
    expect(move).toBeGreaterThanOrEqual(-6);
  });

  it("damps movement by 0.8 for komusubi: 10 wins → +2", () => {
    expect(computeMovementUnits(entry("komusubi"), perf(10, 5), NONE)).toBe(2);
  });
});

// ── bestTierAllowed ────────────────────────────────────────────────────────

describe("bestTierAllowed", () => {
  it("yokozuna always returns tier 1 regardless of performance", () => {
    expect(bestTierAllowed(entry("yokozuna"), perf(4, 11), undefined, NONE)).toBe(1);
  });

  it("demoted ozeki returns tier 3 (locked out of ozeki slot)", () => {
    const demoted = new Set(["r1"]);
    expect(bestTierAllowed(entry("ozeki"), perf(7, 8), undefined, demoted)).toBe(3);
  });

  it("ozeki with promoteToYokozuna flag returns tier 1", () => {
    const p = perf(14, 1, { promoteToYokozuna: true });
    expect(bestTierAllowed(entry("ozeki"), p, undefined, NONE)).toBe(1);
  });

  it("sekiwake with 11+ wins can reach tier 2 (ozeki)", () => {
    expect(bestTierAllowed(entry("sekiwake"), perf(11, 4), undefined, NONE)).toBe(2);
  });

  it("sekiwake with 10 wins stays at tier 3", () => {
    expect(bestTierAllowed(entry("sekiwake"), perf(10, 5), undefined, NONE)).toBe(3);
  });

  it("komusubi with 10+ wins can reach tier 3", () => {
    expect(bestTierAllowed(entry("komusubi"), perf(10, 5), undefined, NONE)).toBe(3);
  });

  it("komusubi with 9 wins stays at tier 4", () => {
    expect(bestTierAllowed(entry("komusubi"), perf(9, 6), undefined, NONE)).toBe(4);
  });

  it("maegashira in top 4 with 10+ wins can reach tier 4", () => {
    const e: BanzukeEntry = {
      rikishiId: "r1",
      position: { rank: "maegashira", rankNumber: 4, side: "east" },
      division: "makuuchi",
    };
    expect(bestTierAllowed(e, perf(10, 5), undefined, NONE)).toBe(4);
  });

  it("maegashira outside top-4 stays at tier 5 with 10 wins", () => {
    expect(bestTierAllowed(entry("maegashira", 10), perf(10, 5), undefined, NONE)).toBe(5);
  });

  it("maegashira with yusho can reach tier 3", () => {
    expect(
      bestTierAllowed(entry("maegashira", 10), perf(14, 1, { yusho: true }), undefined, NONE)
    ).toBe(3);
  });

  it("returns default tier 5 if no special conditions met", () => {
    expect(bestTierAllowed(entry("maegashira", 10), undefined, undefined, NONE)).toBe(5);
    expect(bestTierAllowed(entry("maegashira", 10), perf(8, 7), undefined, NONE)).toBe(5);
  });
});

// ── getOzekiStatus ─────────────────────────────────────────────────────────

describe("getOzekiStatus", () => {
  it("kachi-koshi (8 wins) clears kadoban and resets consecutive count", () => {
    const result = getOzekiStatus(8, 7, 0, undefined);
    expect(result.isKadoban).toBe(false);
    expect(result.consecutiveMakeKoshi).toBe(0);
  });

  it("first make-koshi (7 wins, 8 losses) sets isKadoban=true, consecutive=1", () => {
    const result = getOzekiStatus(7, 8, 0, undefined);
    expect(result.isKadoban).toBe(true);
    expect(result.consecutiveMakeKoshi).toBe(1);
  });

  it("second consecutive make-koshi sets consecutiveMakeKoshi=2", () => {
    const prev = { isKadoban: true, consecutiveMakeKoshi: 1 };
    const result = getOzekiStatus(7, 8, 0, prev);
    expect(result.consecutiveMakeKoshi).toBe(2);
  });

  it("kachi-koshi while kadoban fully clears the status", () => {
    const prev = { isKadoban: true, consecutiveMakeKoshi: 1 };
    const result = getOzekiStatus(8, 7, 0, prev);
    expect(result.isKadoban).toBe(false);
    expect(result.consecutiveMakeKoshi).toBe(0);
  });

  it("absences count toward make-koshi: 7 wins + 1 absence = make-koshi", () => {
    // losses=7, absences=1 → 7+1=8 >= threshold(8) → make-koshi
    const result = getOzekiStatus(7, 7, 1, undefined);
    expect(result.isKadoban).toBe(true);
  });

  it("works with undefined previous state (defaults to clean)", () => {
    const result = getOzekiStatus(8, 7, 0, undefined);
    expect(result).toEqual({ isKadoban: false, consecutiveMakeKoshi: 0 });
  });
});
