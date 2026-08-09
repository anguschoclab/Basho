import { describe, it, expect } from "vitest";
import { RANK_HIERARCHY } from "@/engine/types/banzuke";
import { rankScore as monolithRankScore } from "@/presenters/rikishi";
import { rankScore as decomposedRankScore } from "@/presenters/rikishi/transformers/career";
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

describe("RANK_HIERARCHY tier matches old RANK_TIER values", () => {
  for (const rank of ALL_RANKS) {
    it(`${rank} tier === ${RANK_HIERARCHY[rank].tier}`, () => {
      const expected: Record<Rank, number> = {
        yokozuna: 1,
        ozeki: 2,
        sekiwake: 3,
        komusubi: 4,
        maegashira: 5,
        juryo: 6,
        makushita: 7,
        sandanme: 8,
        jonidan: 9,
        jonokuchi: 10,
      };
      expect(RANK_HIERARCHY[rank].tier).toBe(expected[rank]);
    });
  }
});

describe("monolith rankScore (canonical reference)", () => {
  it("yokozuna east #1 === 1002", () => {
    expect(monolithRankScore("yokozuna", 1, "east")).toBe(1002);
  });

  it("yokozuna west #1 === 1002.5", () => {
    expect(monolithRankScore("yokozuna", 1, "west")).toBe(1002.5);
  });

  it("maegashira west #5 === 5010.5", () => {
    expect(monolithRankScore("maegashira", 5, "west")).toBe(5010.5);
  });

  it("maegashira #5 (no side) === 5010.5 (default west)", () => {
    expect(monolithRankScore("maegashira", 5)).toBe(5010.5);
  });

  it("sekiwake east (no num) === 3000", () => {
    expect(monolithRankScore("sekiwake", undefined, "east")).toBe(3000);
  });

  it("komusubi (all defaults) === 4000.5", () => {
    expect(monolithRankScore("komusubi")).toBe(4000.5);
  });

  it("unknown east #2 === 99004", () => {
    expect(monolithRankScore("unknown", 2, "east")).toBe(99004);
  });
});

describe("decomposed rankScore parity with monolith", () => {
  for (const rank of ALL_RANKS) {
    for (const side of ["east", "west"] as const) {
      for (const num of [undefined, 1, 5]) {
        const label = `${rank} ${side} #${num ?? "undefined"}`;
        it(label, () => {
          expect(decomposedRankScore(rank, num, side)).toBe(monolithRankScore(rank, num, side));
        });
      }
    }
  }
});
