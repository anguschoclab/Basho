/**
 * TalentPoolStateService.ts — Pool state initialization and lifecycle.
 * Handles ensureTalentPoolState, pool refresh, yearly aging, and
 * reinsertion of released/injected rikishi back into the pool.
 */

import { SeededRNG } from "../../rng";
import { RNGRegistry } from "../../core/RNGRegistry";
import { createImpactBuilder } from "../../core/ImpactBuilder";
import type { StateImpact } from "../../core/StateImpact";
import { WorldState } from "../../types/world";
import { Id } from "../../types/common";
import { Rikishi } from "../../types/rikishi";
import {
  TalentPoolType,
  TalentCandidate,
  TalentPoolWorldState,
  TalentPoolState,
} from "../../types/talent";
import { generateCandidate } from "./CandidateGenerator";
import { isForeign } from "../../utils/identity";
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
          populationCap: 50,
          hiddenReserveCap: 20,
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
          populationCap: 40,
          hiddenReserveCap: 15,
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
          populationCap: 30,
          hiddenReserveCap: 10,
          candidatesVisible: [],
          candidatesHidden: [],
          lastRefreshWeek: world.week ?? 0,
          scarcityBand: "normal",
          qualityBand: "normal",
        },
      },
    };
  }
  if (!world.talentPool) {
    throw new Error("Talent pool not initialized");
  }
  return world.talentPool;
}

/**
 * Reinjects a released rikishi back into the talent pool as a free agent.
 */
export function reinjectToTalentPool(world: WorldState, rikishi: Rikishi): void {
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

  tp.candidates[candidateId] = {
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
  };

  // Add to the appropriate pool's visible candidates
  const pool = tp.pools[poolType];
  if (
    pool &&
    !pool.candidatesVisible.includes(candidateId) &&
    !pool.candidatesHidden.includes(candidateId)
  ) {
    pool.candidatesVisible.push(candidateId);
  }
}

/**
 * Injects an existing rikishi into the talent pool as a hidden candidate.
 * This is used for "Boss" NPCs (like Global Cup challengers) who can become diagnosable
 * for recruitment if scouting infrastructure is sufficient.
 */
export function injectRikishiAsCandidate(world: WorldState, rikishi: Rikishi): StateImpact {
  const builder = createImpactBuilder("injectRikishiAsCandidate");
  const tp = ensureTalentPoolState(world);
  const pool = tp.pools["foreign"];

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

  tp.candidates[candidateId] = candidate;
  if (!pool.candidatesHidden.includes(candidateId)) {
    pool.candidatesHidden.push(candidateId);
  }

  return builder.build();
}

// ============================================
// INTERNAL POOL REFRESH HELPERS
// ============================================

function fillHiddenCandidates(
  pool: TalentPoolState,
  tp: TalentPoolWorldState,
  toGenerate: number,
  rng: SeededRNG,
  currentYear: number,
  poolType: TalentPoolType,
  idGenerator: () => string
): void {
  for (let i = 0; i < toGenerate; i++) {
    const id = idGenerator();
    const candidate = generateCandidate({
      id,
      rng,
      currentYear,
      poolType,
    });
    tp.candidates[id] = candidate;
    pool.candidatesHidden.push(id);
  }
}

export function refreshAllPools(world: WorldState): void {
  const tp = ensureTalentPoolState(world);
  const rng = RNGRegistry.getSystemRNG(world, "scouting", `refresh_${world.year}`);

  const poolTypes: TalentPoolType[] = ["high_school", "university", "foreign"];
  poolTypes.forEach((pt) => {
    const pool = tp.pools[pt];
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
      tp.candidates[id] = candidate;
      pool.candidatesHidden.push(id);
    }
  });

  tp.lastYearlyRefreshYear = world.year;
}

function filterAgedOutCandidates(
  candidateIds: Id[],
  tp: TalentPoolWorldState,
  currentYear: number,
  maxAge: number
): Id[] {
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

  // Remove aged-out candidates from talent pool
  for (const id of idsToRemove) {
    const nextCandidates = Object.fromEntries(
      Object.entries(tp.candidates).filter(([key]) => key !== id)
    );
    tp.candidates = nextCandidates;
  }

  return filteredIds;
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

  const updatedPools = { ...tp.pools };

  for (const poolType of poolTypes) {
    const pool = { ...tp.pools[poolType] };

    // 1. Age out stale candidates (estimate age from birthYear)
    const maxAge = poolType === "high_school" ? 20 : poolType === "university" ? 24 : 28;
    pool.candidatesVisible = filterAgedOutCandidates(
      pool.candidatesVisible,
      tp,
      currentYear,
      maxAge
    );
    pool.candidatesHidden = filterAgedOutCandidates(pool.candidatesHidden, tp, currentYear, maxAge);

    // 2. Inject fresh prospects for the new year
    const targetFill = Math.floor(pool.hiddenReserveCap * 0.6);
    const currentTotal = pool.candidatesVisible.length + pool.candidatesHidden.length;
    const toGenerate = Math.max(0, targetFill - currentTotal);

    fillHiddenCandidates(pool, tp, toGenerate, rng, currentYear, poolType, () => rng.uuid("CD"));

    updatedPools[poolType] = pool;
  }

  const updatedTalentPool = { ...tp, pools: updatedPools, lastYearlyRefreshYear: currentYear };

  // Note: talentPool updates are not directly supported by ImpactBuilder yet
  // For now, we'll update them directly as talentPool is a nested state
  world.talentPool = updatedTalentPool;

  return builder.build();
}
