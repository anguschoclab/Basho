/**
 * KihakuService.ts
 * ================
 * Calculates the "kihaku isen" (fighting spirit) score for rikishi
 * based on bout metrics accumulated during a basho.
 *
 * The score (0-100) reflects clutch performance, comeback wins,
 * edge crisis survival, and upset frequency.
 */

import type { Rikishi } from "../../types/rikishi";
import type { BashoState } from "../../types/basho";
import type { Id } from "../../types/common";

export interface KihakuInput {
  comebackWins: number;
  edgeCrisisSurvived: number;
  upsetCount: number;
  totalBouts: number;
  wins: number;
}

export const KihakuService = {
  /**
   * Calculate a 0-100 fighting spirit score from bout metrics.
   *
   * Weighting:
   * - Comeback wins: 30% (max 30 points at 5+ comebacks)
   * - Edge crisis survived: 25% (max 25 points at 4+ survivals)
   * - Upset count: 20% (max 20 points at 3+ upsets)
   * - Win ratio: 25% (max 25 points at 80%+ win rate)
   */
  calculateScore(input: KihakuInput): number {
    const comebackPoints = Math.min(input.comebackWins / 5, 1) * 30;
    const edgePoints = Math.min(input.edgeCrisisSurvived / 4, 1) * 25;
    const upsetPoints = Math.min(input.upsetCount / 3, 1) * 20;
    const winRatio = input.totalBouts > 0 ? input.wins / input.totalBouts : 0;
    const winPoints = Math.min(winRatio / 0.8, 1) * 25;

    const raw = comebackPoints + edgePoints + upsetPoints + winPoints;
    return Math.round(Math.max(0, Math.min(100, raw)));
  },

  /**
   * Extract kihaku input from a rikishi's bout metrics in the basho state.
   */
  extractFromBasho(rikishiId: Id, basho: BashoState, wins: number): KihakuInput {
    const metrics = basho.boutMetrics?.[rikishiId];
    if (!metrics) {
      return {
        comebackWins: 0,
        edgeCrisisSurvived: 0,
        upsetCount: 0,
        totalBouts: wins + (basho.standings.get(rikishiId)?.losses ?? 0),
        wins,
      };
    }
    return {
      comebackWins: metrics.comebackWins,
      edgeCrisisSurvived: metrics.edgeCrisisSurvived,
      upsetCount: metrics.upsetCount,
      totalBouts: metrics.opponentTiers.length,
      wins,
    };
  },

  /**
   * Calculate and return the kihaku score for a rikishi.
   */
  evaluateRikishi(rikishi: Rikishi, basho: BashoState): number {
    const input = this.extractFromBasho(rikishi.id, basho, rikishi.currentBashoWins ?? 0);
    return this.calculateScore(input);
  },
};
