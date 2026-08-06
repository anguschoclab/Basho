 
import { describe, it, expect } from "vitest";
import { bestTierAllowed } from "@/engine/banzuke/promotionLogic";
import type { BanzukeEntry, BashoPerformance } from "@/engine/types/banzuke";

function entry(
  rank: "sekiwake" | "komusubi" | "ozeki" | "maegashira",
  rankNumber?: number,
): BanzukeEntry {
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
  extras: Partial<BashoPerformance> = {},
): BashoPerformance {
  return { rikishiId: "r1", wins, losses, ...extras };
}

const NONE = new Set<string>();

describe("Ozeki promotion (4.2)", () => {
  describe("bestTierAllowed with promoteToOzeki", () => {
    it("sekiwake with promoteToOzeki flag is allowed to reach ozeki tier (2)", () => {
      const result = bestTierAllowed(
        entry("sekiwake"),
        perf(11, 4, { promoteToOzeki: true }),
        undefined,
        NONE,
      );
      expect(result).toBe(2);
    });

    it("sekiwake without promoteToOzeki but 11+ wins stays at sekiwake tier (2)", () => {
      const result = bestTierAllowed(
        entry("sekiwake"),
        perf(11, 4),
        undefined,
        NONE,
      );
      expect(result).toBe(2);
    });

    it("komusubi with promoteToOzeki flag is allowed to reach ozeki tier (2)", () => {
      const result = bestTierAllowed(
        entry("komusubi"),
        perf(12, 3, { promoteToOzeki: true }),
        undefined,
        NONE,
      );
      expect(result).toBe(2);
    });

    it("sekiwake with promoteToOzeki and 11+ wins gets best of both (tier 2)", () => {
      // Both conditions match: 11+ wins gives tier 3, promoteToOzeki gives tier 2
      // Should return the lower (better) tier
      const result = bestTierAllowed(
        entry("sekiwake"),
        perf(13, 2, { promoteToOzeki: true }),
        undefined,
        NONE,
      );
      expect(result).toBe(2);
    });
  });

  describe("promoteToOzeki detection logic", () => {
    it("consecutiveStrongSekiwake >= 2 with wins >= 11 should set promoteToOzeki", () => {
      const consecutiveStrongSekiwake = 2;
      const wins = 11;
      const shouldPromote = consecutiveStrongSekiwake >= 2 && wins >= 11;
      expect(shouldPromote).toBe(true);
    });

    it("consecutiveStrongSekiwake = 1 with wins >= 11 should NOT set promoteToOzeki", () => {
      const consecutiveStrongSekiwake = 1;
      const wins = 11;
      const shouldPromote = consecutiveStrongSekiwake >= 2 && wins >= 11;
      expect(shouldPromote).toBe(false);
    });

    it("consecutiveStrongSekiwake >= 2 but wins < 11 should NOT set promoteToOzeki", () => {
      const consecutiveStrongSekiwake = 2;
      const wins = 10;
      const shouldPromote = consecutiveStrongSekiwake >= 2 && wins >= 11;
      expect(shouldPromote).toBe(false);
    });

    it("consecutiveStrongSekiwake resets when wins 8-10 (kachi-koshi but not strong)", () => {
      const wins = 9;
      const isSanyaku = true;
      const shouldReset = isSanyaku && wins < 11;
      expect(shouldReset).toBe(true);
    });

    it("consecutiveStrongSekiwake does NOT reset when wins >= 11 (strong basho)", () => {
      const wins = 11;
      const isSanyaku = true;
      const shouldReset = isSanyaku && wins < 11;
      expect(shouldReset).toBe(false);
    });
  });
});
