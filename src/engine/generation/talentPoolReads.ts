/**
 * talentPoolReads.ts — Read operators for talent pool scouting.
 * Covers candidate visibility queries and foreign rikishi counts.
 */

import type { WorldState } from "@/engine/types/world";
import type { Id } from "@/engine/types/common";
import type { Rikishi } from "@/engine/types/rikishi";
import type { TalentPoolType, TalentCandidate } from "@/engine/types/talent";
import { isForeign } from "@/engine/utils/identity";
import { countsAsForeign, NATURALIZATION_YEARS } from "@/engine/utils/citizenshipUtils";
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
    // Citizenship-aware (§5.2): naturalized and dual-citizen rikishi no longer
    // consume the slot even though their nationality stays foreign.
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
 * A candidate consumes the foreign slot iff foreign-born AND not a dual
 * citizen (§5.1–5.3). A re-entering veteran's citizenship status travels on
 * the candidate — naturalized/dual/native statuses never consume the slot.
 */
export function candidateConsumesForeignSlot(
  candidate: Pick<TalentCandidate, "nationality" | "dualCitizen" | "citizenshipStatus">
): boolean {
  if (!isForeign({ nationality: candidate.nationality })) return false;
  if (candidate.dualCitizen === true) return false;
  const status = candidate.citizenshipStatus;
  return status !== "naturalized" && status !== "dual" && status !== "native";
}

/**
 * Checks if a rikishi counts as foreign for roster-cap purposes.
 * Delegates to the canonical citizenship-aware `countsAsForeign` (§5.2):
 * naturalized and dual-citizen rikishi — and veterans whose residency
 * tenure has completed — do not consume the slot.
 *
 * `currentYear` should be `world.year` when a world is in scope. When
 * omitted, tenure is evaluated at the rikishi's naturalization-eligibility
 * date (joinedHeyaDate + NATURALIZATION_YEARS) — the answer assumes the
 * residency clock has run out, which is the right read for release-path
 * callers reasoning about veterans who already served their tenure.
 */
export function countsAsForeignFromRikishi(
  rikishi: Pick<Rikishi, "nationality" | "citizenshipStatus" | "joinedHeyaDate">,
  currentYear?: number
): boolean {
  const referenceYear =
    currentYear ??
    (rikishi.joinedHeyaDate
      ? parseInt(rikishi.joinedHeyaDate, 10) + NATURALIZATION_YEARS
      : DEFAULT_START_YEAR);
  return countsAsForeign(rikishi as Rikishi, referenceYear);
}
