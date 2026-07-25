/**
 * talentPoolReads.ts — Read operators for talent pool scouting.
 * Covers candidate visibility queries and foreign rikishi counts.
 */

import type { WorldState } from "../../types/world";
import type { Id } from "../../types/common";
import type { TalentPoolType, TalentCandidate } from "../../types/talent";
import { isForeign } from "../../utils/identity";
import { getHeya, getRikishi } from "../../queries";

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
  const heya = isForeignGated ? getHeya(world, world.playerHeyaId!) : undefined;

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
    if (r && isForeign(r)) {
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
          isForeign(c)
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
 * Checks if a rikishi counts as foreign for roster cap purposes.
 */
export function countsAsForeignFromRikishi(rikishi: { nationality?: string }): boolean {
  return isForeign(rikishi);
}

