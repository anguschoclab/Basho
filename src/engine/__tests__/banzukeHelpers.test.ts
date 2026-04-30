import { describe, it, expect } from "vitest";
import {
  compareRanks,
  resolveBanzukeTie,
  formatRank,
  formatRankPosition,
  getRankTitleJa,
  kachiKoshiThreshold,
  isKachiKoshi,
  isMakeKoshi,
  type BanzukeCandidate,
} from "../banzuke/banzukeHelpers";
import type { RankPosition, BashoPerformance, BanzukeEntry } from "../types/banzuke";
import type { WorldState } from "../types/world";

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

  describe("resolveBanzukeTie", () => {
    const createCandidate = (id: string, oldKey: number): BanzukeCandidate => ({
      entry: { rikishiId: id } as BanzukeEntry,
      oldKey,
      desiredKey: 1,
      eligibleBestTier: 1,
    });

    it("resolves by oldKey first", () => {
      const a = createCandidate("r1", 1);
      const b = createCandidate("r2", 2);
      expect(resolveBanzukeTie(a, b, null, new Map())).toBeLessThan(0);
    });

    it("falls back to localeCompare if no world given", () => {
      const a = createCandidate("a", 1);
      const b = createCandidate("b", 1);
      expect(resolveBanzukeTie(a, b, null, new Map())).toBeLessThan(0);
      expect(resolveBanzukeTie(b, a, null, new Map())).toBeGreaterThan(0);
    });

    it("uses H2H if world given", () => {
      const a = createCandidate("r1", 1);
      const b = createCandidate("r2", 1);

      const world = {
        rikishi: new Map([
          ["r1", { id: "r1", h2h: { r2: { wins: 2, losses: 1 } } }],
          ["r2", { id: "r2", h2h: { r1: { wins: 1, losses: 2 } } }],
        ]),
      } as any as WorldState;

      expect(resolveBanzukeTie(a, b, world, new Map())).toBeLessThan(0); // a wins
      expect(resolveBanzukeTie(b, a, world, new Map())).toBeGreaterThan(0); // b loses
    });

    it("uses SOS proxy (opponentAvgTier) if H2H tied/absent", () => {
      const a = createCandidate("r1", 1);
      const b = createCandidate("r2", 1);

      const world = {
        rikishi: new Map([
          ["r1", { id: "r1", h2h: {} }],
          ["r2", { id: "r2", h2h: {} }],
        ]),
      } as any as WorldState;

      const perfs = new Map<string, BashoPerformance>([
        ["r1", { opponentAvgTier: 2 } as BashoPerformance], // harder schedule
        ["r2", { opponentAvgTier: 4 } as BashoPerformance], // easier schedule
      ]);

      expect(resolveBanzukeTie(a, b, world, perfs)).toBeLessThan(0);
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
