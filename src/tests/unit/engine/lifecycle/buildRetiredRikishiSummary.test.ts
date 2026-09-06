import { describe, it, expect } from "vitest";
import { buildRetiredRikishiSummary } from "@/engine/lifecycle/buildRetiredRikishiSummary";
import { mockRikishi } from "../utils";
import type { Rikishi } from "@/engine/types/rikishi";
import type { CareerSnapshot } from "@/engine/types/history";
import type { Rank, Division } from "@/engine/types/banzuke";

function makeSnapshot(
  year: number,
  rank: Rank,
  division: Division,
  wins: number,
  losses: number,
  overrides: Partial<CareerSnapshot> = {}
): CareerSnapshot {
  return {
    id: `snap-${year}-${rank}`,
    bashoId: `basho-${year}`,
    year,
    month: 1,
    bashoName: "Hatsu",
    rank,
    division,
    rankNumber: 1,
    side: "east",
    wins,
    losses,
    absences: 0,
    isYusho: false,
    isJunYusho: false,
    specialPrizes: { shukunsho: false, kantosho: false, ginosho: false },
    weight: 140,
    momentum: 0,
    ...overrides,
  };
}

describe("buildRetiredRikishiSummary", () => {
  it("builds summary from full Rikishi with careerHistory", () => {
    const snapshots: CareerSnapshot[] = [
      // Year 1: 6 bashos
      makeSnapshot(2004, "maegashira", "makuuchi", 10, 5, { isYusho: true }),
      makeSnapshot(2004, "maegashira", "makuuchi", 8, 7),
      makeSnapshot(2004, "maegashira", "makuuchi", 9, 6),
      makeSnapshot(2004, "maegashira", "makuuchi", 11, 4, { isYusho: true }),
      makeSnapshot(2004, "maegashira", "makuuchi", 7, 8),
      makeSnapshot(2004, "maegashira", "makuuchi", 12, 3),
      // Year 2: 6 bashos
      makeSnapshot(2005, "sekiwake", "makuuchi", 13, 2, { isYusho: true }),
      makeSnapshot(2005, "sekiwake", "makuuchi", 10, 5),
      makeSnapshot(2005, "sekiwake", "makuuchi", 11, 4),
      makeSnapshot(2005, "sekiwake", "makuuchi", 9, 6),
      makeSnapshot(2005, "sekiwake", "makuuchi", 8, 7),
      makeSnapshot(2005, "sekiwake", "makuuchi", 10, 5),
    ];

    const rikishi = mockRikishi("r-1", {
      careerWins: 118,
      careerLosses: 67,
      careerHistory: snapshots,
      retirementYear: 2006,
      retirementReason: "Age",
      isRetired: true,
      economics: { totalEarnings: 500_000, kinboshiCount: 10 } as any,
    });

    const summary = buildRetiredRikishiSummary(rikishi);

    expect(summary.id).toBe("r-1");
    expect(summary.shikona).toBe("Wrestler-r-1");
    expect(summary.careerWins).toBe(118);
    expect(summary.careerLosses).toBe(67);
    expect(summary.yushoCount).toBe(3);
    expect(summary.totalEarnings).toBe(500_000);
    expect(summary.kinboshiCount).toBe(10);
    expect(summary.retirementYear).toBe(2006);
    expect(summary.retirementReason).toBe("Age");
    expect(summary.isRetired).toBe(true);
    expect(summary.isSummary).toBe(true);
    expect(summary.yearlyAggregates).toHaveLength(2);
  });

  it("handles rikishi with empty careerHistory", () => {
    const rikishi = mockRikishi("r-empty", {
      careerHistory: [],
      careerWins: 0,
      careerLosses: 0,
      rank: "maegashira",
      division: "makuuchi",
      retirementYear: 2010,
      retirementReason: "Injury",
      isRetired: true,
    });

    const summary = buildRetiredRikishiSummary(rikishi);

    expect(summary.careerWins).toBe(0);
    expect(summary.careerLosses).toBe(0);
    expect(summary.yushoCount).toBe(0);
    expect(summary.yearlyAggregates).toEqual([]);
    expect(summary.peakRank).toBe("maegashira");
    expect(summary.peakDivision).toBe("makuuchi");
  });

  it("computes peakRank using RANK_HIERARCHY tier (lower = higher)", () => {
    // Career progression: maegashira → sekiwake → ozeki → maegashira (decline)
    const snapshots: CareerSnapshot[] = [
      makeSnapshot(2004, "maegashira", "makuuchi", 11, 4),
      makeSnapshot(2005, "sekiwake", "makuuchi", 12, 3),
      makeSnapshot(2006, "ozeki", "makuuchi", 13, 2),
      makeSnapshot(2007, "maegashira", "makuuchi", 8, 7), // demoted
    ];

    const rikishi = mockRikishi("r-peak", {
      careerHistory: snapshots,
      rank: "maegashira", // rank at retirement
      division: "makuuchi",
      retirementYear: 2008,
      retirementReason: "Decline",
      isRetired: true,
    });

    const summary = buildRetiredRikishiSummary(rikishi);

    expect(summary.peakRank).toBe("ozeki");
    expect(summary.peakRankYear).toBe(2006);
    expect(summary.peakDivision).toBe("makuuchi");
  });

  it("yearlyAggregates sums yusho/junYusho/sansho per year correctly", () => {
    const snapshots: CareerSnapshot[] = [
      makeSnapshot(2004, "maegashira", "makuuchi", 14, 1, {
        isYusho: true,
        specialPrizes: { shukunsho: true, kantosho: false, ginosho: true },
      }),
      makeSnapshot(2004, "maegashira", "makuuchi", 13, 2, {
        isYusho: true,
        specialPrizes: { shukunsho: false, kantosho: true, ginosho: false },
      }),
      makeSnapshot(2005, "maegashira", "makuuchi", 12, 3, {
        isJunYusho: true,
        specialPrizes: { shukunsho: false, kantosho: false, ginosho: true },
      }),
    ];

    const rikishi = mockRikishi("r-agg", {
      careerHistory: snapshots,
      retirementYear: 2006,
      retirementReason: "Age",
      isRetired: true,
    });

    const summary = buildRetiredRikishiSummary(rikishi);

    expect(summary.yearlyAggregates).toHaveLength(2);
    const y2004 = summary.yearlyAggregates.find((a) => a.year === 2004)!;
    const y2005 = summary.yearlyAggregates.find((a) => a.year === 2005)!;

    expect(y2004.yusho).toBe(2);
    expect(y2004.junYusho).toBe(0);
    expect(y2004.sansho).toBe(3); // 1 shukunsho + 1 kantosho + 1 ginosho

    expect(y2005.yusho).toBe(0);
    expect(y2005.junYusho).toBe(1);
    expect(y2005.sansho).toBe(1); // 1 ginosho
  });

  it("sanshoCount sums all three sansho types across career", () => {
    const snapshots: CareerSnapshot[] = [
      makeSnapshot(2004, "maegashira", "makuuchi", 11, 4, {
        specialPrizes: { shukunsho: true, kantosho: true, ginosho: false },
      }),
      makeSnapshot(2005, "maegashira", "makuuchi", 11, 4, {
        specialPrizes: { shukunsho: true, kantosho: false, ginosho: true },
      }),
      makeSnapshot(2006, "maegashira", "makuuchi", 11, 4, {
        specialPrizes: { shukunsho: false, kantosho: false, ginosho: true },
      }),
      makeSnapshot(2007, "maegashira", "makuuchi", 11, 4, {
        specialPrizes: { shukunsho: false, kantosho: true, ginosho: true },
      }),
    ];

    const rikishi = mockRikishi("r-sansho", {
      careerHistory: snapshots,
      retirementYear: 2008,
      retirementReason: "Age",
      isRetired: true,
    });

    const summary = buildRetiredRikishiSummary(rikishi);

    // 2 shukunsho + 2 kantosho + 3 ginosho = 7
    expect(summary.sanshoCount).toBe(7);
  });

  it("totalEarnings from rikishi.economics?.totalEarnings ?? 0", () => {
    const withEconomics = mockRikishi("r-eco", {
      careerHistory: [],
      retirementYear: 2010,
      retirementReason: "Age",
      isRetired: true,
      economics: { totalEarnings: 750_000 } as any,
    });
    expect(buildRetiredRikishiSummary(withEconomics).totalEarnings).toBe(750_000);

    const withoutEconomics = mockRikishi("r-noeco", {
      careerHistory: [],
      retirementYear: 2010,
      retirementReason: "Age",
      isRetired: true,
    });
    expect(buildRetiredRikishiSummary(withoutEconomics).totalEarnings).toBe(0);
  });

  it("kinboshiCount from rikishi.economics?.kinboshiCount ?? 0", () => {
    const withKinboshi = mockRikishi("r-kin", {
      careerHistory: [],
      retirementYear: 2010,
      retirementReason: "Age",
      isRetired: true,
      economics: { kinboshiCount: 7 } as any,
    });
    expect(buildRetiredRikishiSummary(withKinboshi).kinboshiCount).toBe(7);

    const withoutKinboshi = mockRikishi("r-nokin", {
      careerHistory: [],
      retirementYear: 2010,
      retirementReason: "Age",
      isRetired: true,
    });
    expect(buildRetiredRikishiSummary(withoutKinboshi).kinboshiCount).toBe(0);
  });

  it("preserves lineage and bloodlineTraitId for DynastyService compatibility", () => {
    const rikishi = mockRikishi("r-lineage", {
      careerHistory: [],
      retirementYear: 2010,
      retirementReason: "Age",
      isRetired: true,
      lineage: { ancestralHeyaId: "heya-anc", generationalTier: 3, bloodlineTraitId: "trait-x" },
    });

    const summary = buildRetiredRikishiSummary(rikishi);

    expect(summary.lineage).toEqual({
      ancestralHeyaId: "heya-anc",
      generationalTier: 3,
      bloodlineTraitId: "trait-x",
    });
    expect(summary.bloodlineTraitId).toBe("trait-x");
  });
});
