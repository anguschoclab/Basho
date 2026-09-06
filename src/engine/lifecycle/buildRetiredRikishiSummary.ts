/**
 * buildRetiredRikishiSummary.ts
 * =============================
 * Pure function that converts a full Rikishi into a compact RetiredRikishiSummary.
 * Called at year-end by runRetiredRikishiSummarization.
 */

import type { Rikishi } from "../types/rikishi";
import type {
  RetiredRikishiSummary,
  CareerYearAggregate,
} from "../types/history";
import type { Rank, Division } from "../types/banzuke";
import { RANK_HIERARCHY } from "../types/banzuke";

/**
 * Build a compact RetiredRikishiSummary from a full Rikishi.
 * Computes career totals, peak rank, and per-year aggregates from careerHistory.
 */
export function buildRetiredRikishiSummary(rikishi: Rikishi): RetiredRikishiSummary {
  const careerHistory = rikishi.careerHistory ?? [];

  // Career totals from careerHistory
  let yushoCount = 0;
  let junYushoCount = 0;
  let sanshoCount = 0;

  // Track peak rank using RANK_HIERARCHY tier (lower = higher rank)
  let peakRank: Rank = rikishi.rank;
  let peakRankYear: number = rikishi.retirementYear ?? 0;
  let peakDivision: Division = rikishi.division;
  let peakTier = RANK_HIERARCHY[rikishi.rank]?.tier ?? 99;

  // Per-year aggregates
  const yearMap = new Map<number, CareerYearAggregate>();

  for (const snap of careerHistory) {
    // Yusho / jun-yusho
    if (snap.isYusho) yushoCount++;
    if (snap.isJunYusho) junYushoCount++;

    // Sansho (special prizes)
    if (snap.specialPrizes) {
      if (snap.specialPrizes.shukunsho) sanshoCount++;
      if (snap.specialPrizes.kantosho) sanshoCount++;
      if (snap.specialPrizes.ginosho) sanshoCount++;
    }

    // Peak rank tracking (lower tier = higher rank)
    const tier = RANK_HIERARCHY[snap.rank]?.tier ?? 99;
    if (tier < peakTier) {
      peakTier = tier;
      peakRank = snap.rank;
      peakRankYear = snap.year;
      peakDivision = snap.division;
    }

    // Per-year aggregate
    const existing = yearMap.get(snap.year);
    if (existing) {
      existing.wins += snap.wins;
      existing.losses += snap.losses;
      if (snap.isYusho) existing.yusho++;
      if (snap.isJunYusho) existing.junYusho++;
      if (snap.specialPrizes) {
        if (snap.specialPrizes.shukunsho) existing.sansho++;
        if (snap.specialPrizes.kantosho) existing.sansho++;
        if (snap.specialPrizes.ginosho) existing.sansho++;
      }
      // Update to the highest rank achieved that year
      const existingTier = RANK_HIERARCHY[existing.rank]?.tier ?? 99;
      if (tier < existingTier) {
        existing.rank = snap.rank;
        existing.division = snap.division;
      }
    } else {
      yearMap.set(snap.year, {
        year: snap.year,
        division: snap.division,
        rank: snap.rank,
        wins: snap.wins,
        losses: snap.losses,
        yusho: snap.isYusho ? 1 : 0,
        junYusho: snap.isJunYusho ? 1 : 0,
        sansho:
          (snap.specialPrizes?.shukunsho ? 1 : 0) +
          (snap.specialPrizes?.kantosho ? 1 : 0) +
          (snap.specialPrizes?.ginosho ? 1 : 0),
      });
    }
  }

  // Sort yearly aggregates by year ascending
  const yearlyAggregates = Array.from(yearMap.values()).sort((a, b) => a.year - b.year);

  return {
    id: rikishi.id,
    shikona: rikishi.shikona,
    birthYear: rikishi.birthYear,
    heyaId: rikishi.heyaId,
    origin: rikishi.origin,

    careerWins: rikishi.careerWins ?? 0,
    careerLosses: rikishi.careerLosses ?? 0,
    yushoCount,
    junYushoCount,
    sanshoCount,
    kinboshiCount: rikishi.economics?.kinboshiCount ?? 0,
    totalEarnings: rikishi.economics?.totalEarnings ?? 0,

    peakRank,
    peakRankYear,
    peakDivision,

    retirementYear: rikishi.retirementYear ?? 0,
    retirementReason: rikishi.retirementReason ?? "Unknown",
    isRetired: true,

    yearlyAggregates,

    lineage: rikishi.lineage,
    bloodlineTraitId: rikishi.lineage?.bloodlineTraitId,

    isSummary: true,
  };
}
