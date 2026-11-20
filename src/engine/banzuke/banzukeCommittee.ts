// banzukeCommittee.ts
// =======================================================
// Banzuke composition committee (番付編成会議) — the real-JSA
// movement model, expressed through the shared committee framework.
//
// Real mechanics being modeled:
//   - Base movement ≈ (wins − losses)/2 rank slots.
//   - Kyujo counts roughly as losses — NO 1.4–2.5× absence multiplier
//     (the retired units formula systematically over-punished injured
//     rikishi vs. real practice).
//   - Achievements (yusho, jun-yusho, sansho, kinboshi) are informal
//     committee evidence — a bounded nudge, never fixed units.
//   - Ichimon politics exists only as seeded member preference inside
//     the discretion cap — the fictional +300/+250/+100 key offsets
//     are gone.
//
// Rule-bound logic stays outside deliberation: bestTierAllowed()
// enforces the open-slot rule, ozeki kadoban/reclaim, and yokozuna
// eligibility. Rank caps bound the delta the same way the JSA's
// structural limits bound real movement.
// =======================================================

import { RANK_HIERARCHY, type BanzukeEntry, type BashoPerformance } from "@/engine/types/banzuke";
import { conveneCommittee, type CommitteeDecision } from "@/engine/committee/committee";
import { BANZUKE_COMMITTEE } from "@/constants/engine/committee";
import {
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
  JONOKUCHI_NEAR_KACHI_WINS,
  SPECIAL_PRIZE_BONUS_CAP,
  KINBOSHI_BONUS_CAP,
  JUN_YUSHO_BONUS,
  YUSHO_BONUS,
} from "@/constants/engine/banzuke";
import type { SeededRNG } from "@/engine/core/rng";

export interface BanzukeDeliberation {
  /** Final slot delta (+ = promotion direction), capped per rank. */
  readonly delta: number;
  /** The committee record — votes and rationale for feed items. */
  readonly decision: CommitteeDecision;
}

const clampDelta = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

function rankCaps(rank: string, demotedOzeki: boolean, wins: number): [number, number] {
  switch (rank) {
    case "yokozuna":
      return [RANK_MOVE_CAP_YOKOZUNA_MIN, RANK_MOVE_CAP_YOKOZUNA_MAX];
    case "ozeki":
      return demotedOzeki
        ? [RANK_MOVE_CAP_OZEKI_DEMOTED_MIN, RANK_MOVE_CAP_OZEKI_MAX]
        : [RANK_MOVE_CAP_OZEKI_MIN, RANK_MOVE_CAP_OZEKI_MAX];
    case "sekiwake":
    case "komusubi":
      return [RANK_MOVE_CAP_SANYAKU_MIN, RANK_MOVE_CAP_SANYAKU_MAX];
    case "makushita":
      return [RANK_MOVE_CAP_MAKUSHITA_MIN, RANK_MOVE_CAP_MAKUSHITA_MAX];
    case "jonokuchi":
      // Near-kachi-koshi floor: 3-4 or better is not demoted.
      return wins >= JONOKUCHI_NEAR_KACHI_WINS
        ? [0, RANK_MOVE_CAP_JONOKUCHI_MAX]
        : [RANK_MOVE_CAP_JONOKUCHI_MIN, RANK_MOVE_CAP_JONOKUCHI_MAX];
    default:
      // Maegashira and the other lower divisions share the makuuchi band.
      return [RANK_MOVE_CAP_MAKUUCHI_MIN, RANK_MOVE_CAP_MAKUUCHI_MAX];
  }
}

/** Achievements → informal merit units (bounded downstream by the cap). */
function meritEvidence(perf: BashoPerformance): number {
  let m = 0;
  if (perf.yusho) m += Math.max(1, Math.round(YUSHO_BONUS / 4));
  if (perf.junYusho) m += Math.max(1, Math.round(JUN_YUSHO_BONUS / 4));
  if (perf.specialPrizes) m += Math.min(SPECIAL_PRIZE_BONUS_CAP, perf.specialPrizes);
  if (perf.kinboshi) m += Math.min(KINBOSHI_BONUS_CAP, perf.kinboshi);
  // Resilience evidence (Gap 6): comeback wins and surviving an edge crisis
  // are exactly the informal factors a real committee cites — bounded by cap.
  if (perf.comebackWins) m += Math.min(1, perf.comebackWins);
  if (perf.edgeCrisisSurvived) m += Math.min(1, Math.floor(perf.edgeCrisisSurvived / 2));
  return m;
}

/**
 * Deliberate one rikishi's banzuke movement.
 *
 * `faction` is the rikishi's heya ichimon (or "none") — it only feeds
 * the bounded member-preference channel inside conveneCommittee.
 */
export function deliberateBanzukeMovement(
  entry: BanzukeEntry,
  perf: BashoPerformance | undefined,
  demotedOzeki: Set<string>,
  rng: SeededRNG,
  faction: string = "none"
): BanzukeDeliberation {
  const rank = entry.position.rank;
  const wins = perf?.wins ?? 0;
  const fights = RANK_HIERARCHY[rank].fightsPerBasho;

  // Real rule: every scheduled bout not won or drawn counts against the record —
  // losses and kyujo days alike; draws are neutral. (wins − effectiveLosses)/2 slots.
  const draws = perf?.draws ?? 0;
  const effectiveLosses = Math.max(0, fights - wins - draws);
  const baseDelta = Math.round((wins - effectiveLosses) / 2);

  const decisions = conveneCommittee(
    BANZUKE_COMMITTEE,
    [
      {
        subjectId: entry.rikishiId,
        baseScore: perf ? baseDelta : 0,
        merits: perf ? meritEvidence(perf) : 0,
        demerits: 0,
        faction,
      },
    ],
    rng
  );
  const decision = decisions.get(entry.rikishiId);
  if (!decision) throw new Error(`banzuke committee dropped case ${entry.rikishiId}`);

  const [lo, hi] = rankCaps(rank, demotedOzeki.has(entry.rikishiId), wins);
  return { delta: clampDelta(decision.score, lo, hi), decision };
}
