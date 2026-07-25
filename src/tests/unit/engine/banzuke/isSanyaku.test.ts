import { describe, it, expect } from "vitest";
import { RANK_HIERARCHY } from "@/engine/types/banzuke";
import { isSanyakuRank } from "@/constants/engine/rankDisplay";
import type { Rank } from "@/engine/types/banzuke";

const ALL_RANKS: Rank[] = [
  "yokozuna",
  "ozeki",
  "sekiwake",
  "komusubi",
  "maegashira",
  "juryo",
  "makushita",
  "sandanme",
  "jonidan",
  "jonokuchi",
];

describe("RANK_HIERARCHY isSanyaku values", () => {
  const expected: Record<Rank, boolean> = {
    yokozuna: true,
    ozeki: true,
    sekiwake: true,
    komusubi: true,
    maegashira: false,
    juryo: false,
    makushita: false,
    sandanme: false,
    jonidan: false,
    jonokuchi: false,
  };

  for (const rank of ALL_RANKS) {
    it(`${rank}.isSanyaku === ${expected[rank]}`, () => {
      expect(RANK_HIERARCHY[rank].isSanyaku).toBe(expected[rank]);
    });
  }
});

describe("isSanyakuRank helper", () => {
  for (const rank of ALL_RANKS) {
    it(`isSanyakuRank("${rank}") matches RANK_HIERARCHY`, () => {
      expect(isSanyakuRank(rank)).toBe(RANK_HIERARCHY[rank].isSanyaku);
    });
  }

  it("returns false for unknown rank", () => {
    expect(isSanyakuRank("unknown")).toBe(false);
  });
});
