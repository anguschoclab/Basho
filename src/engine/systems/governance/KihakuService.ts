/**
 * KihakuService.ts
 * ================
 * Calculates the "kihaku isen" (fighting spirit) score for rikishi
 * based on bout metrics accumulated during a basho.
 *
 * The score (0-100) reflects clutch performance, comeback wins,
 * edge crisis survival, playoff wins, yusho-contention bouts,
 * and penalties for make-koshi and final-day absence.
 *
 * Scoring (per plan §1C):
 * - comebackWins → +15 each
 * - edgeCrisisSurvived → +10 each
 * - Playoff wins → +20 each
 * - Yusho-contention bout wins (day 12+, within 1 win of leader) → +8 each
 * - Make-koshi → -20
 * - absentFinalDay → -25
 * - No bout metrics → returns 50 (neutral default)
 * - Clamped to 0-100
 */

import type { Rikishi } from "../../types/rikishi";
import type { BashoState, MatchSchedule } from "../../types/basho";
import type { Id } from "../../types/common";

export interface KihakuInput {
  comebackWins: number;
  edgeCrisisSurvived: number;
  playoffWins: number;
  yushoContentionWins: number;
  isMakeKoshi: boolean;
  absentFinalDay: boolean;
  hasMetrics: boolean;
}

export const KihakuService = {
  /**
   * Calculate a 0-100 fighting spirit score from bout metrics.
   * Returns 50 (neutral default) when no metrics are available.
   */
  calculateScore(input: KihakuInput): number {
    if (!input.hasMetrics) return 50;

    let raw = 0;
    raw += input.comebackWins * 15;
    raw += input.edgeCrisisSurvived * 10;
    raw += input.playoffWins * 20;
    raw += input.yushoContentionWins * 8;
    if (input.isMakeKoshi) raw -= 20;
    if (input.absentFinalDay) raw -= 25;

    return Math.round(Math.max(0, Math.min(100, raw)));
  },

  /**
   * Count playoff wins for a rikishi from basho matches.
   * Playoff bouts have boutId starting with "playoff".
   */
  countPlayoffWins(rikishiId: Id, matches: MatchSchedule[]): number {
    let count = 0;
    for (const match of matches) {
      if (!match.boutId.startsWith("playoff")) continue;
      if (!match.result) continue;
      if (match.result.winnerRikishiId === rikishiId) count++;
    }
    return count;
  },

  /**
   * Count yusho-contention bout wins for a rikishi.
   * Yusho-contention bouts are on day 12+ where the winner was within 1 win of the leader.
   */
  countYushoContentionWins(
    rikishiId: Id,
    matches: MatchSchedule[],
    standings: Map<Id, { wins: number; losses: number; absences?: number }>
  ): number {
    // Find the best win total at end of basho
    let bestWins = 0;
    for (const [, rec] of standings) {
      if (rec.wins > bestWins) bestWins = rec.wins;
    }

    let count = 0;
    for (const match of matches) {
      if (match.day < 12) continue;
      if (!match.result) continue;
      if (match.result.winnerRikishiId !== rikishiId) continue;

      // Check if winner was within 1 win of the leader at the time of this bout.
      // We approximate by checking final standings — if the winner's final win total
      // is within 1 of the best, they were in yusho contention.
      const finalRec = standings.get(rikishiId);
      if (finalRec && Math.abs(finalRec.wins - bestWins) <= 1) {
        count++;
      }
    }
    return count;
  },

  /**
   * Extract kihaku input from a rikishi's bout metrics in the basho state.
   */
  extractFromBasho(
    rikishiId: Id,
    basho: BashoState,
    wins: number,
    absentFinalDay: boolean
  ): KihakuInput {
    const metrics = basho.boutMetrics?.[rikishiId];
    const standingsRec =
      basho.standings instanceof Map ? basho.standings.get(rikishiId) : undefined;
    const losses = standingsRec?.losses ?? 0;
    const isMakeKoshi = losses > wins;

    if (!metrics) {
      return {
        comebackWins: 0,
        edgeCrisisSurvived: 0,
        playoffWins: this.countPlayoffWins(rikishiId, basho.matches ?? []),
        yushoContentionWins: this.countYushoContentionWins(
          rikishiId,
          basho.matches ?? [],
          basho.standings instanceof Map
            ? basho.standings
            : new Map(Object.entries(basho.standings))
        ),
        isMakeKoshi,
        absentFinalDay,
        hasMetrics: false,
      };
    }
    return {
      comebackWins: metrics.comebackWins,
      edgeCrisisSurvived: metrics.edgeCrisisSurvived,
      playoffWins: this.countPlayoffWins(rikishiId, basho.matches ?? []),
      yushoContentionWins: this.countYushoContentionWins(
        rikishiId,
        basho.matches ?? [],
        basho.standings instanceof Map ? basho.standings : new Map(Object.entries(basho.standings))
      ),
      isMakeKoshi,
      absentFinalDay,
      hasMetrics: true,
    };
  },

  /**
   * Calculate and return the kihaku score for a rikishi.
   */
  evaluateRikishi(rikishi: Rikishi, basho: BashoState): number {
    const input = this.extractFromBasho(
      rikishi.id,
      basho,
      rikishi.currentBashoWins ?? 0,
      rikishi.absentFinalDay ?? false
    );
    return this.calculateScore(input);
  },
};
