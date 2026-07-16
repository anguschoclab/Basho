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
 * duds. This file is a pure, read-only helper — it is NOT wired into any recruitment
 * decision path yet.
 */

import {
  PERCEPTION_NOISE_BASE,
  PERCEPTION_NOISE_FLOOR,
  PERCEPTION_NOISE_OFFICE_BONUS,
  PERCEPTION_NOISE_PER_SCOUT,
} from "@/constants/engine/scoutingPerception";
import { rngFromSeed } from "@/engine/rng";
import { getHeya, getHeyaStaff } from "@/engine/queries";
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
 * Returns a deterministic, per-(stable, candidate) noisy ESTIMATE of a recruitment
 * candidate's true talentSeed. Different stables perceive the same candidate
 * differently; the same stable always perceives the same candidate identically
 * (pure function of world seed + heyaId + candidateId).
 *
 * Tolerates heyas with no staff/infrastructure records (0 scouts, no office) — this is
 * also the correct production default for a stable that hasn't invested in scouting.
 */
export function perceivedTalentSeed(
  world: WorldState,
  heyaId: Id,
  candidate: TalentCandidate
): number {
  const scoutCount = getHeyaStaff(world, heyaId).filter(
    (s) => s.role === "scout" && s.careerPhase !== "retired"
  ).length;

  const heya = getHeya(world, heyaId);
  const hasScoutingOffice = heya?.infrastructure?.scouting_office?.status === "active";

  const spread = scoutingNoiseSpread(scoutCount, hasScoutingOffice ?? false);

  const rng = rngFromSeed(`scout_${heyaId}_${candidate.candidateId}`, "scouting", "estimate");
  const noise = (rng.next() * 2 - 1) * spread;

  return Math.max(0, Math.min(100, candidate.talentSeed + noise));
}
