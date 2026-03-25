import type { Rank, RankPosition, BanzukeEntry, BashoPerformance, RankInfo } from "./types/banzuke";

/**
 * Pure math utility for rank calculations.
 * Standardizes how (Win/Loss, Current Rank) maps to (New Rank, Score).
 */
export class RankEvaluator {
  private rankHierarchy: Record<Rank, RankInfo>;
  private kachiKoshiThresholds: Record<Rank, number>;

  constructor(rankHierarchy: Record<Rank, RankInfo>) {
    this.rankHierarchy = rankHierarchy;
    this.kachiKoshiThresholds = {} as any;
    for (const r of Object.keys(rankHierarchy) as Rank[]) {
      this.kachiKoshiThresholds[r] = Math.floor(rankHierarchy[r].fightsPerBasho / 2) + 1;
    }
  }

  public getKachiKoshiThreshold(rank: Rank): number {
    return this.kachiKoshiThresholds[rank];
  }

  public calculateAbsencePenalty(absences: number, totalBouts: number): number {
    if (absences === 0) return 0;
    const heavyKyujo = absences >= Math.floor(totalBouts * 0.5);
    const absenceWeight = heavyKyujo ? 1.75 : 1.25;
    return Math.round(absences * absenceWeight);
  }

  public calculatePerformanceBonuses(perf: BashoPerformance): number {
    let bonus = 0;
    if (typeof perf.opponentAvgTier === "number" && Number.isFinite(perf.opponentAvgTier)) {
      bonus += Math.max(-1, Math.min(1, Math.round((5 - perf.opponentAvgTier) * 0.5)));
    }
    if (perf.yusho) bonus += 5;
    if (perf.junYusho) bonus += 2;
    if (typeof perf.specialPrizes === "number" && Number.isFinite(perf.specialPrizes)) {
      bonus += Math.max(0, Math.min(3, perf.specialPrizes));
    }
    if (typeof perf.kinboshi === "number" && Number.isFinite(perf.kinboshi)) {
      bonus += Math.max(0, Math.min(3, perf.kinboshi));
    }
    return bonus;
  }

  public calculateBaseMove(rank: Rank, perf: BashoPerformance): number {
    const bouts = this.rankHierarchy[rank].fightsPerBasho;
    const required = this.kachiKoshiThresholds[rank];
    const wins = perf.wins ?? 0;
    const abs = perf.absences ?? 0;

    const marginVsKK = wins - required;
    const absencePenalty = this.calculateAbsencePenalty(abs, bouts);
    const bonuses = this.calculatePerformanceBonuses(perf);

    return marginVsKK - absencePenalty + bonuses;
  }

  public clampMovementByRank(move: number, rank: Rank, isDemotedOzeki: boolean): number {
    if (rank === "yokozuna") return Math.max(-2, Math.min(2, Math.round(move)));
    if (rank === "ozeki") {
      const damped = Math.round(move * 0.65);
      if (isDemotedOzeki) return Math.min(-6, damped - 4);
      return Math.max(-4, Math.min(4, damped));
    }
    if (rank === "sekiwake" || rank === "komusubi") {
      return Math.max(-6, Math.min(6, Math.round(move * 0.8)));
    }
    return Math.max(-10, Math.min(10, Math.round(move)));
  }

  public computeMovementUnits(
    rank: Rank,
    rikishiId: string,
    perf: BashoPerformance | undefined,
    demotedOzeki: Set<string>
  ): number {
    if (!perf) return 0;
    return this.clampMovementByRank(
      this.calculateBaseMove(rank, perf),
      rank,
      demotedOzeki.has(rikishiId)
    );
  }

  public getBestTierAllowed(
    rank: Rank,
    rikishiId: string,
    perf: BashoPerformance | undefined,
    demotedOzeki: Set<string>
  ): number {
    const tier = this.rankHierarchy[rank].tier;
    if (rank === "yokozuna") return 1;
    if (rank === "ozeki" && demotedOzeki.has(rikishiId)) return 3;
    if (rank === "ozeki" && perf?.promoteToYokozuna) return 1;
    if (rank === "sekiwake" && (perf?.wins ?? 0) >= 11) return 2;
    if (rank === "komusubi" && (perf?.wins ?? 0) >= 10) return 3;

    if (rank === "maegashira") {
      const wins = perf?.wins ?? 0;
      const rn = 99; // Fallback or pass in actual rankNumber if needed
      if (perf?.yusho) return 3;
      if (wins >= 10) return 4; // Simplified: any M with 10+ wins can hit Sanyaku if slots open
    }

    return tier;
  }
}
