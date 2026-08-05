import {
  RANK_HIERARCHY,
  type Rank,
  type BashoPerformance,
  type BanzukeEntry,
} from "../types/banzuke";
import { kachiKoshiThreshold } from "./banzukeHelpers";
import { OzekiKadobanState } from "./ozekiLogic";

/** Calculation of absence penalty based on bouts. */
function calculateAbsencePenalty(absences: number, totalBouts: number): number {
  if (absences === 0) return 0;
  // Full Kyujo (all matches missed) should be extremely punishing in sumo
  const isFullKyujo = absences >= totalBouts;
  const heavyKyujo = absences >= Math.floor(totalBouts * 0.5);
  const absenceWeight = isFullKyujo ? 2.5 : heavyKyujo ? 1.8 : 1.4;
  return Math.round(absences * absenceWeight);
}

/** Calculation of performance bonuses (Yusho, Ginboshi, etc). */
function calculatePerformanceBonuses(perf: BashoPerformance): number {
  let bonus = 0;
  if (typeof perf.opponentAvgTier === "number")
    bonus += Math.max(-1, Math.min(1, Math.round((5 - perf.opponentAvgTier) * 0.5)));
  if (perf.yusho) bonus += 5;
  if (perf.junYusho) bonus += 2;
  if (perf.specialPrizes) bonus += Math.min(3, perf.specialPrizes);
  if (perf.kinboshi) bonus += Math.min(3, perf.kinboshi);
  // Resilience bonuses: comeback wins and edge crisis survival (Gap 6)
  if (perf.comebackWins) bonus += Math.min(2, perf.comebackWins);
  if (perf.edgeCrisisSurvived) bonus += Math.min(2, Math.floor(perf.edgeCrisisSurvived / 2));
  return bonus;
}

/** Calculation of base movement units based on wins and penalties. */
function calculateBaseMove(rank: Rank, perf: BashoPerformance): number {
  const bouts = RANK_HIERARCHY[rank].fightsPerBasho;
  const required = kachiKoshiThreshold(rank);
  const wins = perf.wins ?? 0;
  const abs = perf.absences ?? 0;

  return wins - required - calculateAbsencePenalty(abs, bouts) + calculatePerformanceBonuses(perf);
}

/** Main movement model. */
export function computeMovementUnits(
  entry: BanzukeEntry,
  perf: BashoPerformance | undefined,
  demotedOzeki: Set<string>
): number {
  if (!perf) return 0;
  const move = calculateBaseMove(entry.position.rank, perf);
  const rank = entry.position.rank;

  if (rank === "yokozuna") return Math.max(-2, Math.min(2, move));
  if (rank === "ozeki") {
    const damped = Math.round(move * 0.65);
    if (demotedOzeki.has(entry.rikishiId)) return Math.min(-6, damped - 4);
    return Math.max(-4, Math.min(4, damped));
  }
  if (rank === "sekiwake" || rank === "komusubi")
    return Math.max(-8, Math.min(8, Math.round(move * 0.8)));

  // Maegashira and below have high volatility
  if (entry.division === "makuuchi") return Math.max(-18, Math.min(15, move));

  // Makushita: rank-position dependent movement (top 20 get amplified, lower get dampened)
  if (rank === "makushita") {
    const rankNum = entry.position.rankNumber ?? 60;
    const isTop = rankNum <= 20;
    // For promotions: top-ranked get 1.5x; for demotions: top-ranked get 0.5x (less punishment)
    // Bottom-ranked: 0.8x promotions, 1.5x demotions (more punishment)
    const multiplier = move >= 0
      ? (isTop ? 1.5 : 0.8)
      : (isTop ? 0.5 : 1.5);
    const adjusted = Math.round(move * multiplier);
    return Math.max(-30, Math.min(25, adjusted));
  }

  return Math.max(-30, Math.min(25, move));
}

/** Determines the highest tier a rikishi is allowed to occupy based on performance. */
export function bestTierAllowed(
  entry: BanzukeEntry,
  perf: BashoPerformance | undefined,
  _ozekiState: OzekiKadobanState | undefined,
  demotedOzeki: Set<string>,
  reclaimableOzeki: Set<string> = new Set()
): number {
  const rank = entry.position.rank;
  const tier = RANK_HIERARCHY[rank].tier;

  if (rank === "yokozuna") return 1;
  if (rank === "ozeki" && demotedOzeki.has(entry.rikishiId)) return 3;
  if (rank === "ozeki" && perf?.promoteToYokozuna) return 1;
  if (rank === "sekiwake" && perf?.promoteToOzeki) return 2;
  if (rank === "sekiwake" && (perf?.wins ?? 0) >= 11) return 2;
  // Ozeki reclaim: demoted ozeki at sekiwake with 10+ wins can return to ozeki
  if (rank === "sekiwake" && reclaimableOzeki.has(entry.rikishiId) && (perf?.wins ?? 0) >= 10) return 2;
  // 33-win Ozeki promotion: sekiwake with 10+ wins and 33+ total across 3 basho
  if (rank === "sekiwake" && (perf?.wins ?? 0) >= 10 && (perf?.sekiwakeThreeBashoWins ?? 0) >= 33) return 2;
  if (rank === "komusubi" && perf?.promoteToOzeki) return 2;
  if (rank === "komusubi" && (perf?.wins ?? 0) >= 10) return 3;

  if (rank === "maegashira") {
    const wins = perf?.wins ?? 0;
    if (perf?.yusho) return 3;
    if ((entry.position.rankNumber ?? 99) <= 4 && wins >= 10) return 4;
  }

  // Jonokuchi special promotion: yusho → sandanme (tier 8), kachi-koshi → jonidan (tier 9)
  if (rank === "jonokuchi") {
    const wins = perf?.wins ?? 0;
    const threshold = kachiKoshiThreshold(rank);
    if (perf?.yusho) return 8;
    if (wins >= threshold) return 9;
  }

  return tier;
}
