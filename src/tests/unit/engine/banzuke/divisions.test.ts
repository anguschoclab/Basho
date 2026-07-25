import { describe, it, expect } from "vitest";
import { RANK_HIERARCHY } from "@/engine/types/banzuke";
import { isSekitoriRank, getRanksByDivision, getDivisionOfRank } from "@/constants/engine/rankDisplay";
import type { Rank, Division } from "@/engine/types/banzuke";

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

describe("RANK_HIERARCHY isSekitori values", () => {
  const expected: Record<Rank, boolean> = {
    yokozuna: true,
    ozeki: true,
    sekiwake: true,
    komusubi: true,
    maegashira: true,
    juryo: true,
    makushita: false,
    sandanme: false,
    jonidan: false,
    jonokuchi: false,
  };

  for (const rank of ALL_RANKS) {
    it(`${rank}.isSekitori === ${expected[rank]}`, () => {
      expect(RANK_HIERARCHY[rank].isSekitori).toBe(expected[rank]);
    });
  }
});

describe("isSekitoriRank helper", () => {
  for (const rank of ALL_RANKS) {
    it(`isSekitoriRank("${rank}") matches RANK_HIERARCHY`, () => {
      expect(isSekitoriRank(rank)).toBe(RANK_HIERARCHY[rank].isSekitori);
    });
  }

  it("returns false for unknown rank", () => {
    expect(isSekitoriRank("unknown")).toBe(false);
  });
});

describe("getRanksByDivision", () => {
  it("makuuchi returns 5 ranks ordered by tier", () => {
    const result = getRanksByDivision("makuuchi");
    expect(result).toEqual(["yokozuna", "ozeki", "sekiwake", "komusubi", "maegashira"]);
  });

  it("juryo returns ['juryo']", () => {
    expect(getRanksByDivision("juryo")).toEqual(["juryo"]);
  });

  it("makushita returns ['makushita']", () => {
    expect(getRanksByDivision("makushita")).toEqual(["makushita"]);
  });

  it("sandanme returns ['sandanme']", () => {
    expect(getRanksByDivision("sandanme")).toEqual(["sandanme"]);
  });

  it("jonidan returns ['jonidan']", () => {
    expect(getRanksByDivision("jonidan")).toEqual(["jonidan"]);
  });

  it("jonokuchi returns ['jonokuchi']", () => {
    expect(getRanksByDivision("jonokuchi")).toEqual(["jonokuchi"]);
  });
});

describe("getDivisionOfRank", () => {
  const expected: Record<Rank, Division> = {
    yokozuna: "makuuchi",
    ozeki: "makuuchi",
    sekiwake: "makuuchi",
    komusubi: "makuuchi",
    maegashira: "makuuchi",
    juryo: "juryo",
    makushita: "makushita",
    sandanme: "sandanme",
    jonidan: "jonidan",
    jonokuchi: "jonokuchi",
  };

  for (const rank of ALL_RANKS) {
    it(`getDivisionOfRank("${rank}") === "${expected[rank]}"`, () => {
      expect(getDivisionOfRank(rank)).toBe(expected[rank]);
    });
  }

  it("returns undefined for unknown rank", () => {
    expect(getDivisionOfRank("unknown")).toBeUndefined();
  });
});
