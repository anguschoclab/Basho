// @ts-nocheck
/**
 * TalentPoolStateService.ts — Pool state initialization and lifecycle.
 * Handles ensureTalentPoolState, pool refresh, yearly aging, and
 * reinsertion of released/injected rikishi back into the pool.
 */

import { RNGRegistry } from "../../core/RNGRegistry";
import { createImpactBuilder } from "../../core/ImpactBuilder";
import type { StateImpact } from "../../core/StateImpact";
import type { WorldState } from "../../types/world";
import type { Id } from "../../types/common";
import type { Rikishi } from "../../types/rikishi";
import { TalentPoolType, TalentCandidate, TalentPoolWorldState } from "../../types/talent";
import { generateCandidate } from "./CandidateGenerator";
import { buildCombatProfile } from "../../archetype";

/**
 * Ensures the talent pool state is initialized.
 */
export function ensureTalentPoolState(world: WorldState): TalentPoolWorldState {
  if (!world.talentPool) {
    world.talentPool = {
      version: "1.0.0",
      lastYearlyRefreshYear: world.year ?? 2025,
      candidates: {},
      pools: {
        high_school: {
          poolId: "high_school",
          poolType: "high_school",
          refreshCadence: "yearly",
          populationCap: 450,
          hiddenReserveCap: 400,
          candidatesVisible: [],
          candidatesHidden: [],
          lastRefreshWeek: world.week ?? 0,
          scarcityBand: "normal",
          qualityBand: "normal",
        },
        university: {
          poolId: "university",
          poolType: "university",
          refreshCadence: "yearly",
          populationCap: 300,
          hiddenReserveCap: 250,
          candidatesVisible: [],
          candidatesHidden: [],
          lastRefreshWeek: world.week ?? 0,
          scarcityBand: "normal",
          qualityBand: "normal",
        },
        foreign: {
          poolId: "foreign",
          poolType: "foreign",
          refreshCadence: "yearly",
          populationCap: 200,
          hiddenReserveCap: 150,
          candidatesVisible: [],
          candidatesHidden: [],
          lastRefreshWeek: world.week ?? 0,
          scarcityBand: "normal",
          qualityBand: "normal",
        },
      },
    };
  }
  return world.talentPool;
}

/**
 * Reinjects a released rikishi back into the talent pool as a free agent.
 * Returns StateImpact describing the update.
 */
export function reinjectToTalentPool(world: WorldState, rikishi: Rikishi): StateImpact {
  const builder = createImpactBuilder("reinjectToTalentPool");
  const tp = ensureTalentPoolState(world);

  // Create a candidate from the rikishi
  const candidateId = rikishi.id;
  const poolType =
    (rikishi.nationality ?? "Japan") !== "Japan"
      ? "foreign"
      : rikishi.origin?.toLowerCase().includes("university")
        ? "university"
        : "high_school";

  // Determine archetype based on rikishi stats or default to hybrid
  const archetype: "oshi" | "yotsu" | "hybrid" = "hybrid";
  const combatProfile = buildCombatProfile(archetype);

  const nextCandidates = {
    ...tp.candidates,
    [candidateId]: {
      candidateId,
      personId: rikishi.id,
      name: rikishi.shikona,
      nationality: rikishi.nationality ?? "Japan",
      birthYear: rikishi.birthYear ?? world.year - 20,
      originRegion: rikishi.origin ?? "Unknown",
      visibilityBand: "obscure",
      reputationSeed: rikishi.talentSeed ?? 50,
      tags: [],
      combatProfile,
      availabilityState: "available",
      competingSuitors: [],
      archetype,
      style: archetype,
      heightPotentialCm: rikishi.height ?? 180,
      weightPotentialKg: rikishi.weight ?? 100,
      talentSeed: rikishi.talentSeed ?? 50,
      temperament: {
        discipline: 50,
        volatility: 50,
      },
    } as TalentCandidate,
  };

  const nextPools = { ...tp.pools };
  const pool = { ...nextPools[poolType] };
  if (
    pool &&
    !pool.candidatesVisible.includes(candidateId) &&
    !pool.candidatesHidden.includes(candidateId)
  ) {
    pool.candidatesVisible = [...pool.candidatesVisible, candidateId];
  }
  nextPools[poolType] = pool;

  builder.updateWorldField("talentPool", {
    ...tp,
    candidates: nextCandidates,
    pools: nextPools,
  });

  return builder.build();
}

/**
 * Injects an existing rikishi into the talent pool as a hidden candidate.
 * This is used for "Boss" NPCs (like Global Cup challengers) who can become diagnosable
 * for recruitment if scouting infrastructure is sufficient.
 */
export function injectRikishiAsCandidate(world: WorldState, rikishi: Rikishi): StateImpact {
  const builder = createImpactBuilder("injectRikishiAsCandidate");
  const tp = ensureTalentPoolState(world);

  // Convert rikishi to candidate
  const candidateId = `cd_${rikishi.id}`;
  const candidate: TalentCandidate = {
    candidateId,
    personId: rikishi.id,
    name: rikishi.shikona,
    nationality: rikishi.nationality ?? "foreign",
    birthYear: rikishi.birthYear ?? world.year - 24,
    originRegion: rikishi.origin ?? "International",
    visibilityBand: "hidden", // Start hidden (requires scouting_office Level 2+)
    reputationSeed: rikishi.talentSeed ?? 90,
    tags: ["global_cup_challenger"],
    combatProfile: rikishi.combatProfile || buildCombatProfile("hybrid"),
    availabilityState: "available",
    competingSuitors: [],
    archetype: rikishi.combatProfile?.archetype ?? "hybrid",
    style: rikishi.combatProfile?.style ?? "hybrid",
    heightPotentialCm: rikishi.height ?? 190,
    weightPotentialKg: rikishi.weight ?? 150,
    talentSeed: rikishi.talentSeed ?? 95,
    temperament: { discipline: 80, volatility: 40 },
  };

  const nextCandidates = { ...tp.candidates, [candidateId]: candidate };
  const nextPools = { ...tp.pools };
  const pool = { ...nextPools["foreign"] };
  if (!pool.candidatesHidden.includes(candidateId)) {
    pool.candidatesHidden = [...pool.candidatesHidden, candidateId];
  }
  nextPools["foreign"] = pool;

  builder.updateWorldField("talentPool", {
    ...tp,
    candidates: nextCandidates,
    pools: nextPools,
  });

  return builder.build();
}

// ============================================
// INTERNAL POOL REFRESH HELPERS
// ============================================

// 196: Unused fillHiddenCandidates removed

export function refreshAllPools(world: WorldState): StateImpact {
  const builder = createImpactBuilder("refreshAllPools");
  const tp = ensureTalentPoolState(world);
  const rng = RNGRegistry.getSystemRNG(world, "scouting", `refresh_${world.year}`);

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
export function tickYear(world: WorldState): StateImpact {
  const builder = createImpactBuilder("tickYear");
  const tp = ensureTalentPoolState(world);
  const currentYear = world.year ?? 2025;
  const rng = RNGRegistry.getSystemRNG(world, "scouting", `yearly_refresh_${currentYear}`);

  const poolTypes: TalentPoolType[] = ["high_school", "university", "foreign"];

  const nextPools = { ...tp.pools };
  let nextCandidates = { ...tp.candidates };

  for (const poolType of poolTypes) {
    const pool = { ...tp.pools[poolType] };

    // 1. Age out stale candidates (estimate age from birthYear)
    const maxAge = poolType === "high_school" ? 20 : poolType === "university" ? 24 : 28;
    const visible = filterAgedOutCandidates(pool.candidatesVisible, tp, currentYear, maxAge);
    const hidden = filterAgedOutCandidates(pool.candidatesHidden, tp, currentYear, maxAge);

    pool.candidatesVisible = visible.filteredIds;
    pool.candidatesHidden = hidden.filteredIds;

    // Remove from nextCandidates
    const removedIds = [...visible.idsToRemove, ...hidden.idsToRemove];
    if (removedIds.length > 0) {
      const removedSet = new Set(removedIds as string[]);
      nextCandidates = Object.fromEntries(
        Object.entries(nextCandidates).filter(([id]) => !removedSet.has(id))
      ) as Record<Id, TalentCandidate>;
    }

    // 2. Inject fresh prospects for the new year — fill to full cap
    const targetFill = pool.hiddenReserveCap;
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
  });

  return builder.build();
}