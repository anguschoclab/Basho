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
import { bestTierAllowed } from "@/engine/banzuke/promotionLogic";
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

  it("sekiwake with 11+ wins alone cannot reach tier 2 — no single-basho ozeki shortcut (JSA)", () => {
    // Even a dominant record is insufficient without the 3-basho ~33-win body.
    expect(bestTierAllowed(entry("sekiwake"), perf(11, 4), undefined, NONE)).toBe(3);
    expect(bestTierAllowed(entry("sekiwake"), perf(15, 0), undefined, NONE)).toBe(3);
  });

  it("sekiwake with 33+ sanyaku wins over 3 basho and 10+ here can reach tier 2", () => {
    // The real JSA promotion standard.
    expect(
      bestTierAllowed(
        entry("sekiwake"),
        perf(11, 4, { sekiwakeThreeBashoWins: 33 }),
        undefined,
        NONE
      )
    ).toBe(2);
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
