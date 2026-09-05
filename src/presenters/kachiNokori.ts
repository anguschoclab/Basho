/**
 * kachiNokori.ts — presenter for kachi-nokori (wins needed for kachi-koshi)
 * and cohort (heya roster) basho progress stats.
 *
 * Kachi-koshi = "majority wins" (8+ for makuuchi, threshold varies by rank).
 * Kachi-nokori = threshold - currentWins, clamped to 0.
 */
import type { Rikishi } from "../engine/types/rikishi";
import type { Rank } from "../engine/types/banzuke";
import { kachiKoshiThreshold, isKachiKoshi, isMakeKoshi } from "../engine/banzuke/banzukeHelpers";

/**
 * Compute wins remaining to kachi-koshi for a rikishi.
 * Returns null for retired rikishi or those without a valid rank.
 */
export function computeKachiNokori(r: Rikishi): number | null {
  if (r.isRetired) return null;
  if (!r.rank) return null;
  const threshold = kachiKoshiThreshold(r.rank as Rank);
  const wins = r.currentBashoWins ?? 0;
  return Math.max(0, threshold - wins);
}

export interface CohortStats {
  /** Total active rikishi in the cohort */
  total: number;
  /** Rikishi who have already achieved kachi-koshi */
  kachiKoshi: number;
  /** Rikishi who have already suffered make-koshi */
  makeKoshi: number;
  /** Rikishi still in contention (neither kachi-koshi nor make-koshi) */
  inContention: number;
}

/**
 * Project cohort (heya roster) basho progress stats.
 */
export function projectCohortStats(rikishi: Rikishi[]): CohortStats {
  let kachiKoshi = 0;
  let makeKoshi = 0;

  for (const r of rikishi) {
    if (r.isRetired) continue;
    if (!r.rank) continue;
    const wins = r.currentBashoWins ?? 0;
    const losses = r.currentBashoLosses ?? 0;
    if (isKachiKoshi(wins, losses, r.rank as Rank)) {
      kachiKoshi++;
    } else if (isMakeKoshi(wins, losses, r.rank as Rank)) {
      makeKoshi++;
    }
  }

  const total = rikishi.filter((r) => !r.isRetired && r.rank).length;
  return {
    total,
    kachiKoshi,
    makeKoshi,
    inContention: total - kachiKoshi - makeKoshi,
  };
}
