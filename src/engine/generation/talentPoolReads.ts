/**
 * talentPoolReads.ts — Read operators for talent pool scouting.
 * Covers candidate visibility queries and foreign rikishi counts.
 */

import type { WorldState } from "@/engine/types/world";
import type { Id } from "@/engine/types/common";
import type { Rikishi } from "@/engine/types/rikishi";
import type { TalentPoolType, TalentCandidate } from "@/engine/types/talent";
import { isForeign } from "@/engine/utils/identity";
import { countsAsForeign } from "@/engine/utils/citizenshipUtils";
import { DEFAULT_START_YEAR } from "@/constants/engine/calendar";
import {
  FOREIGN_RIKISHI_LIMIT_PER_HEYA,
  NEW_APPRENTICE_MAX_AGE,
  TSUKEDASHI_MAX_AGE,
} from "@/constants/engine/recruitment";
import { getHeya, getRikishi } from "@/engine/core/queries";

// ============================================
// READ OPERATORS
// ============================================

const ORIGIN_TO_EXHIBITION_REGION: Record<string, string> = {
  Mongolia: "Mongolia",
  Georgia: "Georgia",
  Russia: "Europe",
  Bulgaria: "Europe",
  Estonia: "Europe",
  Ukraine: "Europe",
  Hungary: "Europe",
  "Czech Republic": "Europe",
  Brazil: "Americas",
  USA: "Americas",
  Hawaii: "Americas",
  Canada: "Americas",
  Argentina: "Americas",
  Kazakhstan: "East_Asia",
  China: "East_Asia",
  "South Korea": "East_Asia",
  Taiwan: "East_Asia",
};

/**
 * Resolve a foreign candidate's effective regional presence score.
 * Checks both the exact `originRegion` string (e.g. "Mongolia") and its
 * canonical `ExhibitionRegion` bucket (e.g. "Russia" -> "Europe").
 */
export function resolveForeignRegionalPresence(
  presence: Record<string, number> | undefined,
  originRegion: string
): number {
  if (!presence) return 0;
  const direct = presence[originRegion] ?? 0;
  const mappedRegion = ORIGIN_TO_EXHIBITION_REGION[originRegion];
  const mapped = mappedRegion ? (presence[mappedRegion] ?? 0) : 0;
  return Math.max(direct, mapped);
}

/**
 * Lists candidates currently visible in a specific pool.
 */
export function listVisibleCandidates(
  world: WorldState,
  poolType: TalentPoolType
): TalentCandidate[] {
  const tp = world.talentPool;
  if (!tp) return [];
  const pool = tp.pools[poolType];
  if (!pool) return [];

  const candidates: TalentCandidate[] = [];
  const isForeignGated = poolType === "foreign" && world.playerHeyaId;
  const heya = isForeignGated ? getHeya(world, world.playerHeyaId ?? "") : undefined;

  if (isForeignGated && heya) {
    const presence = heya.regionalPresence;
    for (const id of pool.candidatesVisible) {
      const candidate = tp.candidates[id];
      if (candidate && resolveForeignRegionalPresence(presence, candidate.originRegion) >= 40) {
        candidates.push(candidate);
      }
    }
    return candidates;
  }

  for (const id of pool.candidatesVisible) {
    const candidate = tp.candidates[id];
    if (candidate) {
      candidates.push(candidate);
    }
  }

  return candidates;
}

/**
 * Gets the player's scouting level for a specific candidate.
 */
export function getCandidateScoutingLevel(world: WorldState, candidateId: Id): number {
  return world.talentPool?.playerScouting?.[candidateId]?.scoutingLevel ?? 0;
}

/**
 * Counts foreign rikishi in a specific stable.
 */
export function getForeignCountInHeya(world: WorldState, heyaId: Id): number {
  return getForeignCountsByHeya(world).get(heyaId) ?? 0;
}

/**
 * Computes foreign rikishi counts for all stables in a single pass.
 * Includes both active roster rikishi and signed-but-not-yet-materialized
 * candidates (which remain in pool `candidatesVisible` lists until
 * materialization removes them).
 */
export function getForeignCountsByHeya(world: WorldState): Map<Id, number> {
  const counts = new Map<Id, number>();

  for (const rikishiId of world.activeRikishiIds) {
    const r = getRikishi(world, rikishiId);
    // Post-2010 binding (§5.2): every rikishi who debuted as a foreign
    // national consumes the slot until retirement; only pre-debut citizens
    // (dual/native) are exempt.
    if (r && countsAsForeign(r, world.year)) {
      counts.set(r.heyaId, (counts.get(r.heyaId) ?? 0) + 1);
    }
  }

  if (world.talentPool) {
    const tp = world.talentPool;
    for (const pt of ["high_school", "university", "foreign"] as const) {
      const pool = tp.pools[pt];
      if (!pool) continue;
      for (const cId of pool.candidatesVisible) {
        const c = tp.candidates[cId];
        if (
          c &&
          c.availabilityState === "signed" &&
          c.competingSuitors.length > 0 &&
          candidateConsumesForeignSlot(c)
        ) {
          const heyaId = c.competingSuitors[0].heyaId;
          counts.set(heyaId, (counts.get(heyaId) ?? 0) + 1);
        }
      }
    }
  }

  return counts;
}

/**
 * A candidate consumes the foreign slot iff foreign-born AND not already a
 * Japanese citizen before debut (§5.1–5.3, post-2010 rule). "dual"/"native"
 * candidates entered sumo as Japanese recruits and are exempt; a "naturalized"
 * candidate debuted as a foreign national, so the slot stays bound.
 */
export function candidateConsumesForeignSlot(
  candidate: Pick<TalentCandidate, "nationality" | "dualCitizen" | "citizenshipStatus">
): boolean {
  if (!isForeign({ nationality: candidate.nationality })) return false;
  if (candidate.dualCitizen === true) return false;
  const status = candidate.citizenshipStatus;
  return status !== "dual" && status !== "native";
}

/**
 * Checks if a rikishi counts as foreign for slot purposes. Delegates to the
 * canonical `countsAsForeign` (§5.2, post-2010): the slot binds at debut, so
 * tenure and post-debut naturalization no longer release it.
 */
export function countsAsForeignFromRikishi(
  rikishi: Pick<Rikishi, "nationality" | "citizenshipStatus" | "joinedHeyaDate">,
  currentYear?: number
): boolean {
  return countsAsForeign(rikishi as Rikishi, currentYear ?? DEFAULT_START_YEAR);
}

// ============================================
// SIGNABILITY PREDICATES (shared player/NPC gates)
// ============================================

/**
 * JSA age eligibility (shindeshi kensa): a standard recruit must debut under
 * `NEW_APPRENTICE_MAX_AGE`; tsukedashi-qualified amateurs get the
 * `TSUKEDASHI_MAX_AGE` exception. Age is derived from `birthYear` — the same
 * computation used by `offerCandidate`.
 */
export function isCandidateAgeEligible(
  world: WorldState,
  candidate: Pick<TalentCandidate, "birthYear" | "tsukedashi">
): boolean {
  const maxAge = candidate.tsukedashi
    ? TSUKEDASHI_MAX_AGE
    : NEW_APPRENTICE_MAX_AGE;
  return world.year - candidate.birthYear < maxAge;
}

/**
 * Foreign-slot gate (§5.3/5.4): only slot-consuming candidates are blocked;
 * dual citizens and native-status recruits are exempt. Reads the roster-side
 * foreign count — NPC batch paths additionally track pending-signing
 * occupancy within a pass.
 */
export function isCandidateForeignBlocked(
  world: WorldState,
  candidate: TalentCandidate,
  heyaId: Id
): boolean {
  return (
    candidateConsumesForeignSlot(candidate) &&
    getForeignCountInHeya(world, heyaId) >= FOREIGN_RIKISHI_LIMIT_PER_HEYA
  );
}

/**
 * Composite signability predicate — the single source for the JSA offer/
 * signing gates (age, availability, foreign slot). Player `offerCandidate`
 * and every NPC signing path must funnel through this.
 */
export function isCandidateSignable(
  world: WorldState,
  candidate: TalentCandidate,
  heyaId: Id
): boolean {
  if (!isCandidateAgeEligible(world, candidate)) return false;
  if (
    candidate.availabilityState !== "available" &&
    candidate.availabilityState !== "in_talks"
  ) {
    return false;
  }
  return !isCandidateForeignBlocked(world, candidate, heyaId);
}
