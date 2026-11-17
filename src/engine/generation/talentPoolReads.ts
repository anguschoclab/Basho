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
import { getHeya, getRikishi } from "@/engine/core/queries";

// ============================================
// READ OPERATORS
// ============================================

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
    const presence = heya.regionalPresence || {};
    for (const id of pool.candidatesVisible) {
      const candidate = tp.candidates[id];
      if (candidate && (presence[candidate.originRegion] || 0) >= 40) {
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
