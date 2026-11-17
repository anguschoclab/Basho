import {
  RANK_HIERARCHY,
  type BashoPerformance,
  type BanzukeEntry,
} from "@/engine/types/banzuke";
import { kachiKoshiThreshold } from "@/engine/banzuke/banzukeHelpers";
import { OzekiKadobanState } from "@/engine/banzuke/ozekiLogic";
import {
  SEKIWAKE_OZEKI_RECLAIM_WINS,
  SEKIWAKE_33_WIN_THRESHOLD,
  KOMUSUBI_PROMOTION_WINS,
  MAEGASHIRA_PROMOTION_WINS,
  MAEGASHIRA_TOP_RANK_THRESHOLD,
  JONOKUCHI_YUSHO_TIER,
  JONOKUCHI_KACHI_TIER,
} from "@/constants/engine/banzuke";

/**
 * Whether a Yokozuna candidate's recent yusho/jun-yusho record constitutes a
 * stat-eligible strong case (2+ yusho, or 1 yusho + 1 jun-yusho). Shared by
 * lifecycle deliberation records and UI promotion projections so the rule
 * cannot drift between engine events and displayed narrative.
 */
export function isYokozunaStrongCase(yushos: number, junYushos: number): boolean {
  return yushos >= 2 || (yushos >= 1 && junYushos >= 1);
}

/** Determines the highest tier a rikishi is allowed to occupy based on performance. */
export function bestTierAllowed(
  entry: BanzukeEntry,
  perf: BashoPerformance | undefined,
  _ozekiState: OzekiKadobanState | undefined,
  demotedOzeki: Set<string>,
  reclaimableOzeki?: Set<string>
): number {
  const reclaimable = reclaimableOzeki ?? new Set<string>();
  const rank = entry.position.rank;
  const tier = RANK_HIERARCHY[rank].tier;

  if (rank === "yokozuna") return 1;
  if (rank === "ozeki" && demotedOzeki.has(entry.rikishiId)) return 3;
  if (rank === "ozeki" && perf?.promoteToYokozuna) return 1;
  if (rank === "sekiwake" && perf?.promoteToOzeki) return 2;
  // NOTE: no single-basho wins shortcut — JSA ozeki promotion always requires
  // the ~33-wins-over-3-sanyaku-basho body of work (handled below).
  // Ozeki reclaim: demoted ozeki at sekiwake with 10+ wins can return to ozeki
  if (
    rank === "sekiwake" &&
    reclaimable.has(entry.rikishiId) &&
    (perf?.wins ?? 0) >= SEKIWAKE_OZEKI_RECLAIM_WINS
  )
    return 2;
  // 33-win Ozeki promotion: sekiwake with 10+ wins and 33+ total across 3 basho
  if (
    rank === "sekiwake" &&
    (perf?.wins ?? 0) >= SEKIWAKE_OZEKI_RECLAIM_WINS &&
    (perf?.sekiwakeThreeBashoWins ?? 0) >= SEKIWAKE_33_WIN_THRESHOLD
  )
    return 2;
  if (rank === "komusubi" && perf?.promoteToOzeki) return 2;
  if (rank === "komusubi" && (perf?.wins ?? 0) >= KOMUSUBI_PROMOTION_WINS) return 3;

  if (rank === "maegashira") {
    const wins = perf?.wins ?? 0;
    if (perf?.yusho) return 3;
    if (
      (entry.position.rankNumber ?? 99) <= MAEGASHIRA_TOP_RANK_THRESHOLD &&
      wins >= MAEGASHIRA_PROMOTION_WINS
    )
      return 4;
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
