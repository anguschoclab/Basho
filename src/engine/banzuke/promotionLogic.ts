// @ts-nocheck
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
  return Math.max(-30, Math.min(25, move));
}

/** Determines the highest tier a rikishi is allowed to occupy based on performance. */
export function bestTierAllowed(
  entry: BanzukeEntry,
  perf: BashoPerformance | undefined,
  ozekiState: OzekiKadobanState | undefined,
  demotedOzeki: Set<string>
): number {
  const rank = entry.position.rank;
  const tier = RANK_HIERARCHY[rank].tier;

  if (rank === "yokozuna") return 1;
  if (rank === "ozeki" && demotedOzeki.has(entry.rikishiId)) return 3;
  if (rank === "ozeki" && perf?.promoteToYokozuna) return 1;
  if (rank === "sekiwake" && (perf?.wins ?? 0) >= 11) return 2;
  if (rank === "komusubi" && (perf?.wins ?? 0) >= 10) return 3;

  if (rank === "maegashira") {
    const wins = perf?.wins ?? 0;
    if (perf?.yusho) return 3;
    if ((entry.position.rankNumber ?? 99) <= 4 && wins >= 10) return 4;
  }

  return tier;
}
