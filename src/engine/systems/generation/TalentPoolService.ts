/**
 * TalentPoolService.ts — Orchestrates the prospect pipeline.
 * Logic for scouting, revealing, and offering contracts to recruits.
 */

import { SeededRNG, rngForWorld } from "../../rng";
import { WorldState } from "../../types/world";
import { Id } from "../../types/common";
import { 
  TalentPoolType, 
  TalentCandidate, 
  TalentPoolWorldState,
  VisibilityBand,
  CandidateAvailabilityState
} from "../../types/talent";
import { Rikishi } from "../../types/rikishi";
import { generateRikishiName } from "../../shikona";
import { rollArchetype, buildCombatProfile } from "../../archetype";
import { generateCandidate } from "./CandidateGenerator";
import { clampInt } from "../../utils/math";

// --- Constants ---
export const FOREIGN_RIKISHI_LIMIT_PER_HEYA = 1;
export const BASE_SCOUT_COST = 50000;
export const REVEAL_COST = 100000;

// ============================================
// READ OPERATORS
// ============================================

/**
 * Lists candidates currently visible in a specific pool.
 */
export function listVisibleCandidates(world: WorldState, poolType: TalentPoolType): TalentCandidate[] {
  const tp = world.talentPool;
  if (!tp) return [];
  const pool = tp.pools[poolType];
  if (!pool) return [];

  return pool.candidatesVisible
    .map(id => tp.candidates[id])
    .filter(Boolean);
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
  let count = 0;
  for (const r of world.rikishi.values()) {
    if (r.heyaId === heyaId && (r.nationality ?? 'Japan') !== 'Japan') {
      count++;
    }
  }
  // Also count signed candidates not yet on the roster
  if (world.talentPool) {
    for (const c of Object.values(world.talentPool.candidates)) {
      if (c.availabilityState === 'signed' && 
          c.competingSuitors.some(s => s.heyaId === heyaId) && 
          (c.nationality ?? 'Japan') !== 'Japan') {
        count++;
      }
    }
  }
  return count;
}

// ============================================
// MUTATION OPERATORS
// ============================================

/**
 * Reveals a hidden candidate from the reserve into the visible list.
 */
export function scoutPool(
  world: WorldState, 
  poolType: TalentPoolType, 
  options: { revealCount: number } = { revealCount: 1 }
): { revealed: Id[] } {
  const tp = ensureTalentPoolState(world);
  const pool = tp.pools[poolType];
  if (!pool || pool.candidatesHidden.length === 0) return { revealed: [] };

  const rng = rngForWorld(world, "scouting", `reveal_${poolType}_${world.week}`);
  const count = Math.min(options.revealCount, pool.candidatesHidden.length);
  
  const revealed: Id[] = [];
  for (let i = 0; i < count; i++) {
    const idx = rng.int(0, pool.candidatesHidden.length - 1);
    const id = pool.candidatesHidden.splice(idx, 1)[0];
    pool.candidatesVisible.push(id);
    revealed.push(id);
    
    // Set initial visibility band
    const c = tp.candidates[id];
    if (c) c.visibilityBand = "rumored";
  }

  return { revealed };
}

/**
 * Increases intelligence on a specific candidate.
 */
export function scoutCandidate(
  world: WorldState, 
  candidateId: Id, 
  options: { effort: number } = { effort: 1 }
): { ok: boolean; scoutingLevel: number } {
  const tp = ensureTalentPoolState(world);
  const candidate = tp.candidates[candidateId];
  if (!candidate) return { ok: false, scoutingLevel: 0 };

  if (!tp.playerScouting) tp.playerScouting = {};
  if (!tp.playerScouting[candidateId]) {
    tp.playerScouting[candidateId] = { scoutingLevel: 0, lastScoutedWeek: world.week };
  }

  const record = tp.playerScouting[candidateId];
  const rng = rngForWorld(world, "scouting", `intel_${candidateId}_${world.week}`);
  
  const gain = (10 + rng.int(0, 15)) * options.effort;
  record.scoutingLevel = clampInt(record.scoutingLevel + gain, 0, 100);
  record.lastScoutedWeek = world.week;

  // If intel high enough, improve visibility band
  if (record.scoutingLevel >= 70) candidate.visibilityBand = "public";
  else if (record.scoutingLevel >= 30 && candidate.visibilityBand === "hidden") {
    candidate.visibilityBand = "obscure";
  }

  return { ok: true, scoutingLevel: record.scoutingLevel };
}

/**
 * Submits an offer to a candidate from the player's stable.
 */
export function offerCandidate(
  world: WorldState, 
  candidateId: Id, 
  heyaId: Id,
  offerType: "standard" | "aggressive",
  interest: "low" | "medium" | "high" | "all_in"
): { ok: boolean; reason?: string } {
  const tp = ensureTalentPoolState(world);
  const candidate = tp.candidates[candidateId];
  if (!candidate) return { ok: false, reason: "Candidate not found" };

  // 1. Validation: Foreigner limit
  if ((candidate.nationality ?? 'Japan') !== 'Japan') {
    const foreignCount = getForeignCountInHeya(world, heyaId);
    if (foreignCount >= FOREIGN_RIKISHI_LIMIT_PER_HEYA) {
      return { ok: false, reason: "Heya already at foreigner limit (1)." };
    }
  }

  // 2. Validation: Already signed or unavailable
  if (candidate.availabilityState !== 'available' && candidate.availabilityState !== 'in_talks') {
    return { ok: false, reason: "Candidate is no longer accepting offers." };
  }

  // 3. Register suitor
  const existing = candidate.competingSuitors.find(s => s.heyaId === heyaId);
  if (existing) {
    existing.offerType = offerType;
    existing.interestBand = interest;
  } else {
    candidate.competingSuitors.push({
      heyaId,
      offerType,
      interestBand: interest,
      deadlineWeek: world.week + 2
    });
    candidate.availabilityState = "in_talks";
  }

  return { ok: true };
}

/**
 * Weekly maintenance for the talent pool.
 */
export function tickWeek(world: WorldState): void {
  const tp = ensureTalentPoolState(world);
  
  // 1. Weekly decay of scouting intel
  if (tp.playerScouting) {
    for (const [id, record] of Object.entries(tp.playerScouting)) {
      if (world.week - record.lastScoutedWeek > 4) {
        record.scoutingLevel = Math.max(0, record.scoutingLevel - 2);
      }
    }
  }

  // 2. Periodic pool refresh logic (basho cadence)
  // Check if we are at the start of a basho month (odd months)
  if (world.calendar && world.calendar.month % 2 !== 0 && world.calendar.currentDay === 1) {
    refreshAllPools(world);
  }
}

/**
 * Automates recruitment for NPC stables.
 */
export function fillVacanciesForNPC(world: WorldState, targetHeyas: Record<string, number>): void {
  const tp = ensureTalentPoolState(world);
  const rng = rngForWorld(world, "scouting", `npc_fill_${world.week}`);

  for (const [heyaId, vacancyCount] of Object.entries(targetHeyas)) {
    const heya = world.heyas.get(heyaId);
    if (!heya) continue;

    for (let i = 0; i < vacancyCount; i++) {
      // Pick a random visible candidate (or hidden if visibility low)
      const poolTypes: TalentPoolType[] = ["high_school", "university", "foreign"];
      const pt = poolTypes[rng.int(0, 2)];
      const pool = tp.pools[pt];
      
      if (pool.candidatesVisible.length > 0) {
        const cId = pool.candidatesVisible[rng.int(0, pool.candidatesVisible.length - 1)];
        const c = tp.candidates[cId];
        if (c && c.availabilityState === "available") {
          // NPC signs them immediately (simplified)
          c.availabilityState = "signed";
          c.competingSuitors = [{ heyaId, offerType: "standard", interestBand: "high", deadlineWeek: world.week }];
          // In a real system, you'd wait a week, but for NPC world stabilization, direct assignment is safer
          // Logic for converting Candidate to Rikishi usually happens at the start of a basho
        }
      }
    }
  }
}

function refreshAllPools(world: WorldState) {
  const tp = ensureTalentPoolState(world);
  const rng = rngForWorld(world, "scouting", `refresh_${world.year}`);

  const poolTypes: TalentPoolType[] = ["high_school", "university", "foreign"];
  poolTypes.forEach(pt => {
    const pool = tp.pools[pt];
    // Fill until the hidden reserve cap
    const currentCount = pool.candidatesVisible.length + pool.candidatesHidden.length;
    const toGenerate = pool.hiddenReserveCap - currentCount;

    for (let i = 0; i < toGenerate; i++) {
      const id = `cand_${pt}_${world.dayIndexGlobal}_${i}`;
      const candidate = generateCandidate({ id, rng, currentYear: world.year, poolType: pt });
      tp.candidates[id] = candidate;
      pool.candidatesHidden.push(id);
    }
  });

  tp.lastYearlyRefreshYear = world.year;
}

// ============================================
// INTERNAL HELPERS
// ============================================

/**
 * Ensures the talent pool state is initialized.
 */
function ensureTalentPoolState(world: WorldState): TalentPoolWorldState {
  if (!world.talentPool) {
    world.talentPool = {
      version: "1.0.0",
      lastYearlyRefreshYear: world.year,
      candidates: {},
      pools: {
        high_school: createEmptyPool("high_school"),
        university: createEmptyPool("university"),
        foreign: createEmptyPool("foreign")
      },
      playerScouting: {}
    };
  }
  return world.talentPool;
}

function createEmptyPool(type: TalentPoolType) {
  return {
    poolId: `pool_${type}`,
    poolType: type,
    refreshCadence: "basho" as const,
    populationCap: 20,
    hiddenReserveCap: 50,
    candidatesVisible: [],
    candidatesHidden: [],
    lastRefreshWeek: 0,
    scarcityBand: "normal" as const,
    qualityBand: "normal" as const
  };
}
