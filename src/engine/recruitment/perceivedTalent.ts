/**
 * perceivedTalent.ts
 * ===================
 * Imperfect-information scouting for NPC recruitment.
 *
 * WHY: reading a candidate's TRUE `talentSeed` directly is the dynasty engine — the
 * richest stable can always identify and outbid for the objectively best prospect,
 * which snowballs into permanent dominance. Real scouting is fallible. This module
 * gives each stable a deterministic, per-(stable, candidate) NOISY estimate of talent
 * instead of the ground truth. Noise magnitude shrinks with a stable's scouting
 * investment (scout staff + the `scouting_office` facility) but never reaches zero —
 * even elite scouting departments misjudge prospects. The practical effect: money can't
 * reliably buy the actual best recruit, hidden gems can slip past big stables to small
 * ones and develop to their true potential there, and big stables sometimes overpay for
 * duds. This file is a pure, read-only helper — wired into NPC recruitment bidding
 * (TalentPoolNPCRecruitment) as the perceived-talent estimate.
 */

import {
  PERCEPTION_NOISE_BASE,
  PERCEPTION_NOISE_FLOOR,
  PERCEPTION_NOISE_OFFICE_BONUS,
  PERCEPTION_NOISE_PER_SCOUT,
} from "@/constants/engine/scoutingPerception";
import { rngFromSeed } from "@/engine/core/rng";
import { getHeya, getHeyaStaff } from "@/engine/core/queries";
import type { Id } from "@/engine/types/common";
import type { TalentCandidate } from "@/engine/types/talent";
import type { WorldState } from "@/engine/types/world";

/**
 * Computes the ± spread of scouting noise for a stable given its scouting investment.
 * More scouts and a built `scouting_office` tighten the spread, but it can never drop
 * below `PERCEPTION_NOISE_FLOOR` — perfect information is never available.
 */
export function scoutingNoiseSpread(scoutCount: number, hasScoutingOffice: boolean): number {
  return Math.max(
    PERCEPTION_NOISE_FLOOR,
    PERCEPTION_NOISE_BASE -
      scoutCount * PERCEPTION_NOISE_PER_SCOUT -
      (hasScoutingOffice ? PERCEPTION_NOISE_OFFICE_BONUS : 0)
  );
}

/**
 * The stable's scouting noise spread — the candidate-independent part of
 * `perceivedTalentSeed`, hoisted per-heya by hot callers that estimate a
 * whole candidate slate in one pass.
 */
export function scoutNoiseSpreadForHeya(world: WorldState, heyaId: Id): number {
  let scoutCount = 0;
  for (const s of getHeyaStaff(world, heyaId)) {
    if (s.role === "scout" && s.careerPhase !== "retired") {
      scoutCount++;
    }
  }
  const heya = getHeya(world, heyaId);
  const hasScoutingOffice = heya?.infrastructure?.scouting_office?.status === "active";
  return scoutingNoiseSpread(scoutCount, hasScoutingOffice ?? false);
}

/**
 * Returns a deterministic, per-(stable, candidate) noisy ESTIMATE of a recruitment
 * candidate's true talentSeed. Different stables perceive the same candidate
 * differently; the same stable always perceives the same candidate identically
 * (pure function of world seed + heyaId + candidateId).
 *
 * Tolerates heyas with no staff/infrastructure records (0 scouts, no office) — this is
 * also the correct production default for a stable that hasn't invested in scouting.
 * `spreadOverride` must equal `scoutNoiseSpreadForHeya(world, heyaId)` — hot
 * callers pass the hoisted value rather than re-deriving it per candidate.
 */
export function perceivedTalentSeed(
  world: WorldState,
  heyaId: Id,
  candidate: TalentCandidate,
  spreadOverride?: number
): number {
  const spread = spreadOverride ?? scoutNoiseSpreadForHeya(world, heyaId);

  const rng = rngFromSeed(`scout_${heyaId}_${candidate.candidateId}`, "scouting", "estimate");
  const noise = (rng.next() * 2 - 1) * spread;

  return Math.max(0, Math.min(100, candidate.talentSeed + noise));
}

/**
 * Per-stat fogged estimate of a candidate's hidden `potentialStats` — same
 * deterministic (heya, candidate) noise model, keyed additionally by stat so
 * each attribute gets its own independent misjudgment. This is what an
 * "Est. PWR 68±10" scouting line honestly shows: the stable's estimate,
 * never the true ceiling.
 */
export function perceivedCandidateStat(
  world: WorldState,
  heyaId: Id,
  candidate: TalentCandidate,
  stat: string,
  spreadOverride?: number
): number {
  const spread = spreadOverride ?? scoutNoiseSpreadForHeya(world, heyaId);
  const rng = rngFromSeed(
    `scout_${heyaId}_${candidate.candidateId}_stat_${stat}`,
    "scouting",
    "estimate"
  );
  const noise = (rng.next() * 2 - 1) * spread;
  const truth =
    (candidate.potentialStats?.[stat as keyof typeof candidate.potentialStats] as
      | number
      | undefined) ?? 0;
  return Math.max(0, Math.min(100, truth + noise));
}

/**
 * Fogged per-stat potential block for UI digests — returns undefined when
 * the candidate carries no potential projection, so callers never need to
 * read `.potentialStats` themselves (the only place truth is touched).
 */
export function perceivedCandidatePotentialStats(
  world: WorldState,
  heyaId: Id,
  candidate: TalentCandidate,
  stats: string[],
  spreadOverride?: number
): Record<string, number> | undefined {
  if (!candidate.potentialStats) return undefined;
  const out: Record<string, number> = {};
  for (const s of stats) {
    out[s] = perceivedCandidateStat(world, heyaId, candidate, s, spreadOverride);
  }
  return out;
}
