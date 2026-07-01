import { describe, it, expect } from "vitest";
import {
  compareRanks,
  formatRank,
  formatRankPosition,
  getRankTitleJa,
  kachiKoshiThreshold,
  isKachiKoshi,
  isMakeKoshi,
} from "@/engine/banzuke/banzukeHelpers";
import type { RankPosition } from "@/engine/types/banzuke";

describe("banzukeHelpers", () => {
  describe("compareRanks", () => {
    it("compares by tier", () => {
      const a: RankPosition = { rank: "yokozuna", side: "east" }; // tier 1
      const b: RankPosition = { rank: "ozeki", side: "east" }; // tier 2
      expect(compareRanks(a, b)).toBeLessThan(0);
      expect(compareRanks(b, a)).toBeGreaterThan(0);
    });

    it("compares by rank number within same tier", () => {
      const a: RankPosition = { rank: "maegashira", side: "east", rankNumber: 1 };
      const b: RankPosition = { rank: "maegashira", side: "east", rankNumber: 2 };
      expect(compareRanks(a, b)).toBeLessThan(0);
    });

    it("compares by side when number and tier match", () => {
      const a: RankPosition = { rank: "maegashira", side: "east", rankNumber: 1 };
      const b: RankPosition = { rank: "maegashira", side: "west", rankNumber: 1 };
      expect(compareRanks(a, b)).toBeLessThan(0);
      expect(compareRanks(b, a)).toBeGreaterThan(0);
    });

    it("returns 0 if exact same rank", () => {
      const a: RankPosition = { rank: "maegashira", side: "east", rankNumber: 1 };
      expect(compareRanks(a, a)).toBe(0);
    });
  });

  describe("formatters", () => {
    it("formatRank / formatRankPosition formats short strings", () => {
      expect(formatRank({ rank: "yokozuna", side: "east" })).toBe("横綱E");
      expect(formatRank({ rank: "maegashira", side: "west", rankNumber: 5 })).toBe("前頭5W");
      expect(formatRankPosition({ rank: "ozeki", side: "west" })).toBe("大関W");
    });

    it("getRankTitleJa formats Japanese strings", () => {
      expect(getRankTitleJa({ rank: "yokozuna", side: "east" })).toBe("東横綱");
      expect(getRankTitleJa({ rank: "maegashira", side: "west", rankNumber: 5 })).toBe(
        "西前頭5枚目"
      );
    });
  });

  describe("thresholds", () => {
    it("kachiKoshiThreshold", () => {
      expect(kachiKoshiThreshold("maegashira")).toBe(8);
      expect(kachiKoshiThreshold("makushita")).toBe(4);
    });

    it("isKachiKoshi", () => {
      expect(isKachiKoshi(8, 7, "maegashira")).toBe(true);
      expect(isKachiKoshi(7, 8, "maegashira")).toBe(false);
      expect(isKachiKoshi(4, 3, "makushita")).toBe(true);
      expect(isKachiKoshi(3, 4, "makushita")).toBe(false);
    });

    it("isMakeKoshi", () => {
      expect(isMakeKoshi(7, 8, "maegashira")).toBe(true);
      expect(isMakeKoshi(8, 7, "maegashira")).toBe(false);
      // checking absences
      expect(isMakeKoshi(7, 4, "maegashira", 4)).toBe(true); // 4 losses + 4 absences = 8
      expect(isMakeKoshi(3, 3, "makushita", 1)).toBe(true); // 3+1 = 4 >= 4
    });
  });
});
