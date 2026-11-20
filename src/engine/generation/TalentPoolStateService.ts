/**
 * TalentPoolStateService.ts — Pool state initialization and lifecycle.
 * Handles ensureTalentPoolState, pool refresh, yearly aging, and
 * reinsertion of released/injected rikishi back into the pool.
 */

import { RNGRegistry } from "@/engine/core/RNGRegistry";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import type { StateImpact } from "@/engine/core/StateImpact";
import type { WorldState } from "@/engine/types/world";
import { DEFAULT_START_YEAR } from "@/constants/engine/calendar";
import type { Id } from "@/engine/types/common";
import { TalentPoolType, TalentCandidate, TalentPoolWorldState } from "@/engine/types/talent";
import { generateCandidate } from "@/engine/generation/CandidateGenerator";

/** Per-pool capacity pair — the only domain difference between pool kinds. */
export interface PoolCapacitySpec {
  populationCap: number;
  hiddenReserveCap: number;
}

/**
 * Shared pool-state factory — one structural initializer for both the
 * candidate pool (small scouted window) and the full talent pool (large
 * hidden reserve). The capacities are domain constants and must NOT be
 * unified: the scouted candidate pool is intentionally tiny.
 */
export function createDefaultPoolState(
  world: WorldState,
  caps: Record<TalentPoolType, PoolCapacitySpec>
): TalentPoolWorldState {
  const mkPool = (poolType: TalentPoolType) => ({
    poolId: poolType,
    poolType,
    refreshCadence: "yearly" as const,
    ...caps[poolType],
    candidatesVisible: [] as Id[],
    candidatesHidden: [] as Id[],
    lastRefreshWeek: world.week ?? 0,
    scarcityBand: "normal" as const,
    qualityBand: "normal" as const,
  });
  return {
    // @world-builder
    version: "1.0.0",
    lastYearlyRefreshYear: world.year ?? DEFAULT_START_YEAR,
    candidates: {},
    pools: {
      high_school: mkPool("high_school"),
      university: mkPool("university"),
      foreign: mkPool("foreign"),
    },
  };
}

/** Talent pool capacities — the full national pipeline, incl. big hidden reserves. */
const TALENT_POOL_CAPS: Record<TalentPoolType, PoolCapacitySpec> = {
  high_school: { populationCap: 450, hiddenReserveCap: 400 },
  university: { populationCap: 300, hiddenReserveCap: 250 },
  foreign: { populationCap: 200, hiddenReserveCap: 150 },
};

/**
 * Ensures the talent pool state is initialized.
 */
function createDefaultTalentPoolState(world: WorldState): TalentPoolWorldState {
  return createDefaultPoolState(world, TALENT_POOL_CAPS);
}

/**
 * Pure accessor — returns the talent pool or a fresh default WITHOUT
 * assigning it to the input world. Callers persist via updateWorldField.
 */
export function ensureTalentPoolState(world: WorldState): TalentPoolWorldState {
  return world.talentPool ?? createDefaultTalentPoolState(world);
}

// Real JSA has no releases or free agency: a rikishi who leaves a stable
// retires (the only mass moves are official heya-closure/merger transfers,
// handled by executeMerger). The old reinject machinery was removed.

// ============================================
// INTERNAL POOL REFRESH HELPERS
// ============================================

/**
 * Regenerates stale talent-pool entries for every heya while preserving live ones.
 */
export function refreshAllPools(world: WorldState): StateImpact {
  const builder = createImpactBuilder("refreshAllPools");
  const tp = ensureTalentPoolState(world);
  // dayIndexGlobal must be in the cadence: SeededRNG.uuid counters are
  // per-instance, so a year-scoped label regenerates identical candidate ids
  // on every fortnightly refresh — colliding with live candidates.
  const rng = RNGRegistry.getSystemRNG(
    world,
    "scouting",
    `refresh_${world.year}_d${world.dayIndexGlobal ?? 0}`
  );

  const nextCandidates = { ...tp.candidates };
  const nextPools = { ...tp.pools };

  const poolTypes: TalentPoolType[] = ["high_school", "university", "foreign"];
  poolTypes.forEach((pt) => {
    const pool = { ...nextPools[pt] };
    // Fill until the hidden reserve cap
    const currentCount = pool.candidatesVisible.length + pool.candidatesHidden.length;
    const toGenerate = pool.hiddenReserveCap - currentCount;

    for (let i = 0; i < toGenerate; i++) {
      const id = rng.uuid("CD");
      const candidate = generateCandidate({
        id,
        rng,
        currentYear: world.year,
        poolType: pt,
      });
      nextCandidates[id] = candidate;
      pool.candidatesHidden = [...pool.candidatesHidden, id];
    }
    nextPools[pt] = pool;
  });

  builder.updateWorldField("talentPool", {
    ...tp,
    candidates: nextCandidates,
    pools: nextPools,
    lastYearlyRefreshYear: world.year,
  });

  return builder.build();
}

function filterAgedOutCandidates(
  candidateIds: Id[],
  tp: TalentPoolWorldState,
  currentYear: number,
  maxAge: number
): { filteredIds: Id[]; idsToRemove: Id[] } {
  const idsToRemove: Id[] = [];
  const filteredIds = candidateIds.filter((id) => {
    const candidate = tp.candidates[id];
    // Remove ghost IDs where candidate data is missing
    if (!candidate) return false;

    const estimatedAge = currentYear - (candidate.birthYear ?? currentYear - 20);
    if (estimatedAge > maxAge) {
      idsToRemove.push(id);
      return false;
    }
    return true;
  });

  return { filteredIds, idsToRemove };
}

/**
 * Yearly talent pool refresh:
 * - Age out stale candidates who have been available too long
 * - Inject a fresh cohort of prospects for the new year
 * Returns StateImpact describing yearly refresh instead of mutating directly.
 */
export function tickTalentPoolYear(world: WorldState): StateImpact {
  const builder = createImpactBuilder("tickYear");
  const tp = ensureTalentPoolState(world);
  const currentYear = world.year ?? DEFAULT_START_YEAR;
  const rng = RNGRegistry.getSystemRNG(
    world,
    "scouting",
    `yearly_refresh_${currentYear}_d${world.dayIndexGlobal ?? 0}`
  );

  const poolTypes: TalentPoolType[] = ["high_school", "university", "foreign"];

  const nextPools = { ...tp.pools };
  let nextCandidates = { ...tp.candidates };
  // Removed prospects keep resolving via the tombstone — events and requests
  // logged against their personId while they were live are permanent records.
  const departed = new Set<string>(tp.departedIds ?? []);

  for (const poolType of poolTypes) {
    const pool = { ...tp.pools[poolType] };

    // 1. Age out stale candidates (estimate age from birthYear)
    const maxAge = poolType === "high_school" ? 20 : poolType === "university" ? 24 : 28;
    const visible = filterAgedOutCandidates(pool.candidatesVisible, tp, currentYear, maxAge);
    const hidden = filterAgedOutCandidates(pool.candidatesHidden, tp, currentYear, maxAge);

    pool.candidatesVisible = visible.filteredIds;
    pool.candidatesHidden = hidden.filteredIds;

    // Remove from nextCandidates — tombstoning the candidateId and personId
    // keeps historical person refs resolvable after the prospect is gone.
    const removedIds = [...visible.idsToRemove, ...hidden.idsToRemove];
    if (removedIds.length > 0) {
      const removedSet = new Set(removedIds);
      for (const id of removedIds) {
        departed.add(id);
        const personId = tp.candidates[id]?.personId;
        if (personId) departed.add(personId);
      }
      const filteredCandidates: Record<string, TalentCandidate> = {};
      for (const id in nextCandidates) {
        if (Object.prototype.hasOwnProperty.call(nextCandidates, id)) {
          if (!removedSet.has(id)) {
            filteredCandidates[id] = nextCandidates[id];
          }
        }
      }
      nextCandidates = filteredCandidates;
    }

    // 2. Inject fresh prospects for the new year — fill to population cap
    const targetFill = pool.populationCap;
    const currentTotal = pool.candidatesVisible.length + pool.candidatesHidden.length;
    const toGenerate = Math.max(0, targetFill - currentTotal);

    for (let i = 0; i < toGenerate; i++) {
      const id = rng.uuid("CD");
      const candidate = generateCandidate({
        id,
        rng,
        currentYear,
        poolType,
      });
      nextCandidates[id] = candidate;
      pool.candidatesHidden = [...pool.candidatesHidden, id];
    }

    nextPools[poolType] = pool;
  }

  builder.updateWorldField("talentPool", {
    ...tp,
    pools: nextPools,
    candidates: nextCandidates,
    lastYearlyRefreshYear: currentYear,
    departedIds: departed.size > 0 ? [...departed] : tp.departedIds,
  });

  return builder.build();
}
