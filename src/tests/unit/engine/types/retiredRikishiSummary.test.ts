import { describe, it, expect } from "vitest";
import type { RetiredRikishiSummary, CareerYearAggregate } from "@/engine/types/history";
import type { Rank, Division } from "@/engine/types/banzuke";

function makeSummary(overrides: Partial<RetiredRikishiSummary> = {}): RetiredRikishiSummary {
  return {
    id: "r-1",
    shikona: "Test Rikishi",
    birthYear: 1980,
    heyaId: "heya-1",
    origin: "Japan",
    careerWins: 200,
    careerLosses: 150,
    yushoCount: 3,
    junYushoCount: 2,
    sanshoCount: 5,
    kinboshiCount: 10,
    totalEarnings: 500_000,
    peakRank: "ozeki" as Rank,
    peakRankYear: 2005,
    peakDivision: "makuuchi" as Division,
    retirementYear: 2010,
    retirementReason: "Age",
    isRetired: true,
    yearlyAggregates: [],
    isSummary: true,
    ...overrides,
  };
}

function makeYearAggregate(overrides: Partial<CareerYearAggregate> = {}): CareerYearAggregate {
  return {
    year: 2005,
    division: "makuuchi" as Division,
    rank: "ozeki" as Rank,
    wins: 12,
    losses: 3,
    yusho: 1,
    junYusho: 0,
    sansho: 2,
    ...overrides,
  };
}

describe("RetiredRikishiSummary type", () => {
  it("has all required standard fields", () => {
    const s = makeSummary();
    expect(s.id).toBe("r-1");
    expect(s.shikona).toBe("Test Rikishi");
    expect(s.birthYear).toBe(1980);
    expect(s.heyaId).toBe("heya-1");
    expect(s.careerWins).toBe(200);
    expect(s.careerLosses).toBe(150);
    expect(s.yushoCount).toBe(3);
    expect(s.junYushoCount).toBe(2);
    expect(s.sanshoCount).toBe(5);
    expect(s.kinboshiCount).toBe(10);
    expect(s.totalEarnings).toBe(500_000);
    expect(s.peakRank).toBe("ozeki");
    expect(s.peakRankYear).toBe(2005);
    expect(s.peakDivision).toBe("makuuchi");
    expect(s.retirementYear).toBe(2010);
    expect(s.retirementReason).toBe("Age");
    expect(s.yearlyAggregates).toEqual([]);
  });

  it("isRetired is literal true for type narrowing", () => {
    const s = makeSummary();
    // Type-level: isRetired must be `true` literal, not boolean
    const narrowed: true = s.isRetired;
    expect(narrowed).toBe(true);
  });

  it("isSummary is literal true for type narrowing", () => {
    const s = makeSummary();
    const narrowed: true = s.isSummary;
    expect(narrowed).toBe(true);
  });

  it("supports optional lineage and bloodlineTraitId", () => {
    const s = makeSummary({
      lineage: { ancestralHeyaId: "heya-anc", generationalTier: 2, bloodlineTraitId: "trait-1" },
      bloodlineTraitId: "trait-1",
    });
    expect(s.lineage?.ancestralHeyaId).toBe("heya-anc");
    expect(s.bloodlineTraitId).toBe("trait-1");
  });
});

describe("CareerYearAggregate type", () => {
  it("has year, division, rank, wins, losses, yusho, junYusho, sansho", () => {
    const a = makeYearAggregate();
    expect(a.year).toBe(2005);
    expect(a.division).toBe("makuuchi");
    expect(a.rank).toBe("ozeki");
    expect(a.wins).toBe(12);
    expect(a.losses).toBe(3);
    expect(a.yusho).toBe(1);
    expect(a.junYusho).toBe(0);
    expect(a.sansho).toBe(2);
  });
});
