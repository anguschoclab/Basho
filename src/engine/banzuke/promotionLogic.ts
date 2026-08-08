import {
  RANK_HIERARCHY,
  type Rank,
  type BashoPerformance,
  type BanzukeEntry,
} from "../types/banzuke";
import { kachiKoshiThreshold } from "./banzukeHelpers";
import { OzekiKadobanState } from "./ozekiLogic";
import {
  ABSENCE_WEIGHT_FULL_KYUJO,
  ABSENCE_WEIGHT_HEAVY_KYUJO,
  ABSENCE_WEIGHT_DEFAULT,
  HEAVY_KYUJO_FRACTION,
  OPPONENT_TIER_BONUS_MULT,
  OPPONENT_TIER_BONUS_CAP,
  YUSHO_BONUS,
  JUN_YUSHO_BONUS,
  SPECIAL_PRIZE_BONUS_CAP,
  KINBOSHI_BONUS_CAP,
  COMEBACK_WINS_BONUS_CAP,
  EDGE_CRISIS_BONUS_CAP,
  EDGE_CRISIS_DIVISOR,
  RANK_MOVE_CAP_YOKOZUNA_MIN,
  RANK_MOVE_CAP_YOKOZUNA_MAX,
  RANK_MOVE_CAP_OZEKI_MIN,
  RANK_MOVE_CAP_OZEKI_MAX,
  RANK_MOVE_CAP_OZEKI_DEMOTED_MIN,
  RANK_MOVE_CAP_SANYAKU_MIN,
  RANK_MOVE_CAP_SANYAKU_MAX,
  RANK_MOVE_CAP_MAKUUCHI_MIN,
  RANK_MOVE_CAP_MAKUUCHI_MAX,
  RANK_MOVE_CAP_MAKUSHITA_MIN,
  RANK_MOVE_CAP_MAKUSHITA_MAX,
  RANK_MOVE_CAP_JONOKUCHI_MIN,
  RANK_MOVE_CAP_JONOKUCHI_MAX,
  RANK_MOVE_MULT_OZEKI,
  RANK_MOVE_MULT_SANYAKU,
  RANK_MOVE_MULT_MAKUSHITA_TOP_PROMO,
  RANK_MOVE_MULT_MAKUSHITA_BOTTOM_PROMO,
  RANK_MOVE_MULT_MAKUSHITA_TOP_DEMO,
  RANK_MOVE_MULT_MAKUSHITA_BOTTOM_DEMO,
  MAKUSHITA_TOP_RANK_NUMBER,
  MAKUSHITA_DEFAULT_RANK_NUMBER,
  OZEKI_DEMOTED_FLOOR,
  JONOKUCHI_NEAR_KACHI_WINS,
  SEKIWAKE_OZEKI_PROMOTION_WINS,
  SEKIWAKE_OZEKI_RECLAIM_WINS,
  SEKIWAKE_33_WIN_THRESHOLD,
  KOMUSUBI_PROMOTION_WINS,
  MAEGASHIRA_PROMOTION_WINS,
  MAEGASHIRA_TOP_RANK_THRESHOLD,
  JONOKUCHI_YUSHO_TIER,
  JONOKUCHI_KACHI_TIER,
} from "../../constants/engine/banzuke";

/** Calculation of absence penalty based on bouts. */
function calculateAbsencePenalty(absences: number, totalBouts: number): number {
  if (absences === 0) return 0;
  // Full Kyujo (all matches missed) should be extremely punishing in sumo
  const isFullKyujo = absences >= totalBouts;
  const heavyKyujo = absences >= Math.floor(totalBouts * HEAVY_KYUJO_FRACTION);
  const absenceWeight = isFullKyujo ? ABSENCE_WEIGHT_FULL_KYUJO : heavyKyujo ? ABSENCE_WEIGHT_HEAVY_KYUJO : ABSENCE_WEIGHT_DEFAULT;
  return Math.round(absences * absenceWeight);
}

/** Calculation of performance bonuses (Yusho, Ginboshi, etc). */
function calculatePerformanceBonuses(perf: BashoPerformance): number {
  let bonus = 0;
  if (typeof perf.opponentAvgTier === "number")
    bonus += Math.max(-OPPONENT_TIER_BONUS_CAP, Math.min(OPPONENT_TIER_BONUS_CAP, Math.round((5 - perf.opponentAvgTier) * OPPONENT_TIER_BONUS_MULT)));
  if (perf.yusho) bonus += YUSHO_BONUS;
  if (perf.junYusho) bonus += JUN_YUSHO_BONUS;
  if (perf.specialPrizes) bonus += Math.min(SPECIAL_PRIZE_BONUS_CAP, perf.specialPrizes);
  if (perf.kinboshi) bonus += Math.min(KINBOSHI_BONUS_CAP, perf.kinboshi);
  // Resilience bonuses: comeback wins and edge crisis survival (Gap 6)
  if (perf.comebackWins) bonus += Math.min(COMEBACK_WINS_BONUS_CAP, perf.comebackWins);
  if (perf.edgeCrisisSurvived) bonus += Math.min(EDGE_CRISIS_BONUS_CAP, Math.floor(perf.edgeCrisisSurvived / EDGE_CRISIS_DIVISOR));
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

  if (rank === "yokozuna") return Math.max(RANK_MOVE_CAP_YOKOZUNA_MIN, Math.min(RANK_MOVE_CAP_YOKOZUNA_MAX, move));
  if (rank === "ozeki") {
    const damped = Math.round(move * RANK_MOVE_MULT_OZEKI);
    if (demotedOzeki.has(entry.rikishiId)) return Math.min(RANK_MOVE_CAP_OZEKI_DEMOTED_MIN, damped + OZEKI_DEMOTED_FLOOR);
    return Math.max(RANK_MOVE_CAP_OZEKI_MIN, Math.min(RANK_MOVE_CAP_OZEKI_MAX, damped));
  }
  if (rank === "sekiwake" || rank === "komusubi")
    return Math.max(RANK_MOVE_CAP_SANYAKU_MIN, Math.min(RANK_MOVE_CAP_SANYAKU_MAX, Math.round(move * RANK_MOVE_MULT_SANYAKU)));

  // Maegashira and below have high volatility
  if (entry.division === "makuuchi") return Math.max(RANK_MOVE_CAP_MAKUUCHI_MIN, Math.min(RANK_MOVE_CAP_MAKUUCHI_MAX, move));

  // Makushita: rank-position dependent movement (top 20 get amplified, lower get dampened)
  if (rank === "makushita") {
    const rankNum = entry.position.rankNumber ?? MAKUSHITA_DEFAULT_RANK_NUMBER;
    const isTop = rankNum <= MAKUSHITA_TOP_RANK_NUMBER;
    // For promotions: top-ranked get 1.5x; for demotions: top-ranked get 0.5x (less punishment)
    // Bottom-ranked: 0.8x promotions, 1.5x demotions (more punishment)
    const multiplier = move >= 0
      ? (isTop ? RANK_MOVE_MULT_MAKUSHITA_TOP_PROMO : RANK_MOVE_MULT_MAKUSHITA_BOTTOM_PROMO)
      : (isTop ? RANK_MOVE_MULT_MAKUSHITA_TOP_DEMO : RANK_MOVE_MULT_MAKUSHITA_BOTTOM_DEMO);
    const adjusted = Math.round(move * multiplier);
    return Math.max(RANK_MOVE_CAP_MAKUSHITA_MIN, Math.min(RANK_MOVE_CAP_MAKUSHITA_MAX, adjusted));
  }

  // Jonokuchi: special movement floor — slight make-koshi (3-4) gets zero movement,
  // only severe make-koshi (1-6 or 0-7) produces negative movement
  if (rank === "jonokuchi") {
    const wins = perf?.wins ?? 0;
    // 3-4 or better: floor at 0 (no demotion for near-kachi-koshi)
    if (wins >= JONOKUCHI_NEAR_KACHI_WINS) return Math.max(0, Math.min(RANK_MOVE_CAP_JONOKUCHI_MAX, move));
    // 0-7 or 1-6: allow negative movement (punished for total failure)
    return Math.max(RANK_MOVE_CAP_JONOKUCHI_MIN, Math.min(RANK_MOVE_CAP_JONOKUCHI_MAX, move));
  }

  return Math.max(RANK_MOVE_CAP_JONOKUCHI_MIN, Math.min(RANK_MOVE_CAP_JONOKUCHI_MAX, move));
}

/** Determines the highest tier a rikishi is allowed to occupy based on performance. */
export function bestTierAllowed(
  entry: BanzukeEntry,
  perf: BashoPerformance | undefined,
  _ozekiState: OzekiKadobanState | undefined,
  demotedOzeki: Set<string>,
  reclaimableOzeki?: Set<string>,
): number {
  const reclaimable = reclaimableOzeki ?? new Set<string>();
  const rank = entry.position.rank;
  const tier = RANK_HIERARCHY[rank].tier;

  if (rank === "yokozuna") return 1;
  if (rank === "ozeki" && demotedOzeki.has(entry.rikishiId)) return 3;
  if (rank === "ozeki" && perf?.promoteToYokozuna) return 1;
  if (rank === "sekiwake" && perf?.promoteToOzeki) return 2;
  if (rank === "sekiwake" && (perf?.wins ?? 0) >= SEKIWAKE_OZEKI_PROMOTION_WINS) return 2;
  // Ozeki reclaim: demoted ozeki at sekiwake with 10+ wins can return to ozeki
  if (rank === "sekiwake" && reclaimable.has(entry.rikishiId) && (perf?.wins ?? 0) >= SEKIWAKE_OZEKI_RECLAIM_WINS) return 2;
  // 33-win Ozeki promotion: sekiwake with 10+ wins and 33+ total across 3 basho
  if (rank === "sekiwake" && (perf?.wins ?? 0) >= SEKIWAKE_OZEKI_RECLAIM_WINS && (perf?.sekiwakeThreeBashoWins ?? 0) >= SEKIWAKE_33_WIN_THRESHOLD) return 2;
  if (rank === "komusubi" && perf?.promoteToOzeki) return 2;
  if (rank === "komusubi" && (perf?.wins ?? 0) >= KOMUSUBI_PROMOTION_WINS) return 3;

  if (rank === "maegashira") {
    const wins = perf?.wins ?? 0;
    if (perf?.yusho) return 3;
    if ((entry.position.rankNumber ?? 99) <= MAEGASHIRA_TOP_RANK_THRESHOLD && wins >= MAEGASHIRA_PROMOTION_WINS) return 4;
  }

  // Jonokuchi special promotion: yusho → sandanme (tier 8), kachi-koshi → jonidan (tier 9)
  if (rank === "jonokuchi") {
    const wins = perf?.wins ?? 0;
    const threshold = kachiKoshiThreshold(rank);
    if (perf?.yusho) return JONOKUCHI_YUSHO_TIER;
    if (wins >= threshold) return JONOKUCHI_KACHI_TIER;
  }

  return tier;
}
