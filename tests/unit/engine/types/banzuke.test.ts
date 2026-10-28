import { describe, it, expect } from "vitest";
import {
  toRankPosition,
  type NumberedRank,
  type UnnumberedRank,
} from "@/engine/types/banzuke";

const NUMBERED_RANKS: NumberedRank[] = [
  "maegashira",
  "juryo",
  "makushita",
  "sandanme",
  "jonidan",
  "jonokuchi",
];

const UNNUMBERED_RANKS: UnnumberedRank[] = ["yokozuna", "ozeki", "sekiwake", "komusubi"];

describe("toRankPosition", () => {
  describe("numbered ranks", () => {
    it.each(NUMBERED_RANKS)("returns { rank, rankNumber, side } for %s", (rank) => {
      expect(toRankPosition({ rank, side: "east", rankNumber: 7 })).toEqual({
        rank,
        rankNumber: 7,
        side: "east",
      });
    });

    it("preserves the west side", () => {
      expect(toRankPosition({ rank: "maegashira", side: "west", rankNumber: 3 })).toEqual({
        rank: "maegashira",
        rankNumber: 3,
        side: "west",
      });
    });

    it.each([undefined, 0, -1])("throws for maegashira with rankNumber %s", (rankNumber) => {
      expect(() =>
        toRankPosition({ rank: "maegashira", side: "east", rankNumber })
      ).toThrow(/requires rankNumber >= 1/);
    });
  });

  describe("unnumbered ranks", () => {
    it.each(UNNUMBERED_RANKS)("returns { rank, side } without rankNumber for %s", (rank) => {
      const pos = toRankPosition({ rank, side: "west" });
      expect(pos).toEqual({ rank, side: "west" });
      expect(pos.rankNumber).toBeUndefined();
    });

    it("ignores a supplied rankNumber on unnumbered ranks", () => {
      const pos = toRankPosition({ rank: "yokozuna", side: "east", rankNumber: 5 });
      expect(pos).toEqual({ rank: "yokozuna", side: "east" });
    });
  });
});
