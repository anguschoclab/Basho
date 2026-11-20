/**
 * retiredSummary.ts
 * =================
 * Shared `RetiredRikishiSummary` test fixture — the canonical retired-rikishi
 * defaults duplicated across ~8 test files. Files with distinct fixture
 * personas (e.g. Taiho-level accolades) wrap this with their own overrides.
 */

import type { RetiredRikishiSummary } from "@/engine/types/history";

/** Standard retired-rikishi summary — plain maegashira career, no accolades. */
export function retiredSummary(
  id: string,
  overrides: Partial<RetiredRikishiSummary> = {}
): RetiredRikishiSummary {
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
