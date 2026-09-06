import { describe, it, expect } from "vitest";
import { selectRetiredRikishi } from "@/presenters/selectors";
import { makeMockWorld, mockRikishi } from "../engine/utils";
import type { RetiredRikishiSummary } from "@/engine/types/history";
import type { Rikishi } from "@/engine/types/rikishi";

function makeSummary(id: string, overrides: Partial<RetiredRikishiSummary> = {}): RetiredRikishiSummary {
  return {
    id,
    shikona: `Wrestler-${id}`,
    birthYear: 1980,
    heyaId: `heya-${id}`,
    careerWins: 100,
    careerLosses: 50,
    yushoCount: 0,
    junYushoCount: 0,
    sanshoCount: 0,
    kinboshiCount: 0,
    totalEarnings: 0,
    peakRank: "maegashira",
    peakRankYear: 2010,
    peakDivision: "makuuchi",
    retirementYear: 2010,
    retirementReason: "Age",
    isRetired: true,
    yearlyAggregates: [],
    isSummary: true,
    ...overrides,
  };
}

function makeFullRikishi(id: string, overrides: Partial<Rikishi> = {}): Rikishi {
  return mockRikishi(id, {
    isRetired: true,
    retirementYear: 2010,
    retirementReason: "Age",
    ...overrides,
  });
}

describe("selectRetiredRikishi with RetiredRikishiSummary", () => {
  it("returns RetiredRikishiSummary[] from historicalRikishi", () => {
    const world = makeMockWorld();
    world.historicalRikishi = new Map([
      ["r1", makeSummary("r1")],
      ["r2", makeSummary("r2", { careerWins: 200 })],
    ]);

    const retired = selectRetiredRikishi(world);
    expect(retired).toHaveLength(2);
    // Each entry should be a summary
    for (const entry of retired) {
      expect("isSummary" in entry && entry.isSummary).toBe(true);
    }
  });

  it("returns full Rikishi[] for unconverted entries (pre-year-end)", () => {
    const world = makeMockWorld();
    world.historicalRikishi = new Map([
      ["r1", makeFullRikishi("r1")],
      ["r2", makeFullRikishi("r2", { careerWins: 200 })],
    ]);

    const retired = selectRetiredRikishi(world);
    expect(retired).toHaveLength(2);
    // Each entry should be a full Rikishi (has stats)
    for (const entry of retired) {
      expect("stats" in entry).toBe(true);
    }
  });

  it("handles mixed summaries and full Rikishi", () => {
    const world = makeMockWorld();
    world.historicalRikishi = new Map<string, Rikishi | RetiredRikishiSummary>([
      ["r-sum", makeSummary("r-sum")],
      ["r-full", makeFullRikishi("r-full")],
    ]);

    const retired = selectRetiredRikishi(world);
    expect(retired).toHaveLength(2);

    const sumEntry = retired.find((r) => r.id === "r-sum");
    const fullEntry = retired.find((r) => r.id === "r-full");
    expect(sumEntry).toBeDefined();
    expect(fullEntry).toBeDefined();
    expect("isSummary" in sumEntry! && sumEntry!.isSummary).toBe(true);
    expect("stats" in fullEntry!).toBe(true);
  });

  it("returns empty array for empty historicalRikishi", () => {
    const world = makeMockWorld();
    world.historicalRikishi = new Map();
    expect(selectRetiredRikishi(world)).toEqual([]);
  });
});
