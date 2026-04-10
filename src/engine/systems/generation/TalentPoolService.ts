/**
 * TalentPoolService.ts — Orchestrates the prospect pipeline.
 * Logic for scouting, revealing, and offering contracts to recruits.
 */

import { SeededRNG } from "../../rng";
import { RNGRegistry } from "../../core/RNGRegistry";
import { EntityService } from "../../core/EntityService";
import { WorldState } from "../../types/world";
import { Id } from "../../types/common";
import {
  TalentPoolType,
  TalentCandidate,
  TalentPoolWorldState,
  TalentPoolState,
  VisibilityBand,
  CandidateAvailabilityState,
} from "../../types/talent";
import { Rikishi } from "../../types/rikishi";
import { generateRikishiName } from "../../shikona";
import { rollArchetype, buildCombatProfile } from "../../archetype";
import { generateCandidate, promoteCandidateToRikishi } from "./CandidateGenerator";
import { clampInt } from "../../utils/math";
import { EventBus } from "../../events";
import { BardEngine } from "../../narrative/BardEngine";
import { rngFromSeed } from "../../rng";

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
export function listVisibleCandidates(
  world: WorldState,
  poolType: TalentPoolType,
): TalentCandidate[] {
  const tp = world.talentPool;
  if (!tp) return [];
  const pool = tp.pools[poolType];
  if (!pool) return [];

  return pool.candidatesVisible.map((id) => tp.candidates[id]).filter(Boolean);
}

/**
 * Gets the player's scouting level for a specific candidate.
 */
export function getCandidateScoutingLevel(
  world: WorldState,
  candidateId: Id,
): number {
  return world.talentPool?.playerScouting?.[candidateId]?.scoutingLevel ?? 0;
}

/**
 * Counts foreign rikishi in a specific stable.
 */
export function getForeignCountInHeya(world: WorldState, heyaId: Id): number {
  let count = 0;
  for (const r of world.rikishi.values()) {
    if (r.heyaId === heyaId && (r.nationality ?? "Japan") !== "Japan") {
      count++;
    }
  }
  // Also count signed candidates not yet on the roster
  if (world.talentPool) {
    for (const c of Object.values(world.talentPool.candidates)) {
      if (
        c.availabilityState === "signed" &&
        c.competingSuitors.some((s) => s.heyaId === heyaId) &&
        (c.nationality ?? "Japan") !== "Japan"
      ) {
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
  options: { revealCount: number } = { revealCount: 1 },
): { revealed: Id[] } {
  const tp = ensureTalentPoolState(world);
  const pool = tp.pools[poolType];
  if (!pool || pool.candidatesHidden.length === 0) return { revealed: [] };

  const rng = RNGRegistry.getSystemRNG(
    world,
    "scouting",
    `reveal_${poolType}_${world.week}`,
  );
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
  options: { effort: number } = { effort: 1 },
): { ok: boolean; scoutingLevel: number } {
  const tp = ensureTalentPoolState(world);
  const candidate = tp.candidates[candidateId];
  if (!candidate) return { ok: false, scoutingLevel: 0 };

  if (!tp.playerScouting) tp.playerScouting = {};
  if (!tp.playerScouting[candidateId]) {
    tp.playerScouting[candidateId] = {
      scoutingLevel: 0,
      lastScoutedWeek: world.week,
    };
  }

  const record = tp.playerScouting[candidateId];
  const rng = RNGRegistry.getSystemRNG(
    world,
    "scouting",
    `intel_${candidateId}_${world.week}`,
  );

  const gain = (10 + rng.int(0, 15)) * options.effort;
  record.scoutingLevel = clampInt(record.scoutingLevel + gain, 0, 100);
  record.lastScoutedWeek = world.week;

  // If intel high enough, improve visibility band
  if (record.scoutingLevel >= 70) candidate.visibilityBand = "public";
  else if (
    record.scoutingLevel >= 30 &&
    candidate.visibilityBand === "hidden"
  ) {
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
  interest: "low" | "medium" | "high" | "all_in",
): { ok: boolean; reason?: string } {
  const tp = ensureTalentPoolState(world);
  const candidate = tp.candidates[candidateId];
  if (!candidate) return { ok: false, reason: "Candidate not found" };

  const rng = rngFromSeed(`offer-validate-${candidateId}-${heyaId}`, "narrative", "scouting");

  // 1. Validation: Foreigner limit
  if ((candidate.nationality ?? "Japan") !== "Japan") {
    const foreignCount = getForeignCountInHeya(world, heyaId);
    if (foreignCount >= FOREIGN_RIKISHI_LIMIT_PER_HEYA) {
      return { ok: false, reason: BardEngine.resolve(rng, "ui.labels.scouting.reasons.foreigner_limit").text };
    }
  }

  // 2. Validation: Already signed or unavailable
  if (
    candidate.availabilityState !== "available" &&
    candidate.availabilityState !== "in_talks"
  ) {
    return { ok: false, reason: BardEngine.resolve(rng, "ui.labels.scouting.reasons.unavailable").text };
  }

  // 3. Register suitor
  const existing = candidate.competingSuitors.find((s) => s.heyaId === heyaId);
  if (existing) {
    existing.offerType = offerType;
    existing.interestBand = interest;
  } else {
    candidate.competingSuitors.push({
      heyaId,
      offerType,
      interestBand: interest,
      deadlineWeek: world.week + 2,
    });
    candidate.availabilityState = "in_talks";
  }

  return { ok: true };
}

/**
 * Weekly maintenance for the talent pool.
 */
export function tickWeekTalentPool(world: WorldState): void {
  const tp = ensureTalentPoolState(world);

  // 1. Weekly decay of scouting intel
  if (tp.playerScouting) {
    for (const [id, record] of Object.entries(tp.playerScouting)) {
      if (world.week - record.lastScoutedWeek > 4) {
        record.scoutingLevel = Math.max(0, record.scoutingLevel - 2);
      }
    }
  }

  // 2. Resolve expired suitor deadlines: pick the winner, fire fame event for high talent
  for (const candidate of Object.values(tp.candidates)) {
    if (candidate.availabilityState !== 'in_talks') continue;
    if (!candidate.competingSuitors.length) continue;

    const deadlineExpired = candidate.competingSuitors.some(s => world.week >= s.deadlineWeek);
    if (!deadlineExpired) continue;

    // Pick the suitor with the highest interest band
    const bandRank: Record<string, number> = { all_in: 4, high: 3, medium: 2, low: 1 };
    const winner = [...candidate.competingSuitors].sort(
      (a, b) => (bandRank[b.interestBand] ?? 0) - (bandRank[a.interestBand] ?? 0)
    )[0];

    candidate.availabilityState = 'signed';
    candidate.competingSuitors = [winner];

    // High-talent signing: fire fame event and give reputation boost to signing stable
    if (candidate.talentSeed >= 80) {
      const heya = world.heyas.get(winner.heyaId);
      if (heya) {
        heya.reputation = Math.min(100, (heya.reputation ?? 50) + 5);
        const signRng = rngFromSeed(`talent-sign-${candidate.candidateId}`, "narrative", "event");
        EventBus.recruitDiscovered(world, {
          rikishiId: candidate.candidateId,
          heyaId: winner.heyaId,
          shikona: candidate.name,
          heya: heya.name,
          score: candidate.talentSeed,
          status: "high_talent_signed"
        });
      }
    }
  }

  // 3. Periodic pool refresh logic (basho cadence)
  // Check if we are at the start of a basho month (odd months)
  if (
    world.calendar &&
    world.calendar.month % 2 !== 0 &&
    world.calendar.currentDay === 1
  ) {
    refreshAllPools(world);
  }
}

/**
 * Automates recruitment for NPC stables.
 */
export function fillVacanciesForNPC(
  world: WorldState,
  targetHeyas: Record<string, number>,
): void {
  const tp = ensureTalentPoolState(world);
  const rng = RNGRegistry.getSystemRNG(
    world,
    "scouting",
    `npc_fill_${world.week}`,
  );

  for (const [heyaId, vacancyCount] of Object.entries(targetHeyas)) {
    const heya = world.heyas.get(heyaId);
    if (!heya) continue;

    for (let i = 0; i < vacancyCount; i++) {
      // Pick a random visible candidate (or hidden if visibility low)
      const poolTypes: TalentPoolType[] = [
        "high_school",
        "university",
        "foreign",
      ];
      const pt = poolTypes[rng.int(0, 2)];
      const pool = tp.pools[pt];

      if (pool.candidatesVisible.length > 0) {
        const cId =
          pool.candidatesVisible[rng.int(0, pool.candidatesVisible.length - 1)];
        const c = tp.candidates[cId];
        if (c && c.availabilityState === "available") {
          // NPC fast-path signing: bypass multi-week negotiation to stabilize world
          c.availabilityState = "signed";
          c.competingSuitors = [{ heyaId, offerType: "standard", interestBand: "high", deadlineWeek: world.week }];
          
          // Materialize immediately for NPCs to keep the banzuke populated
          materializeCandidateToRikishi(world, cId, heyaId);
        }
      }
    }
  }
}

/**
 * Converts a signed candidate into a full Rikishi entity and adds them to the world.
 */
export function materializeCandidateToRikishi(
  world: WorldState,
  candidateId: Id,
  heyaId: Id,
): Rikishi | null {
  const tp = ensureTalentPoolState(world);
  const candidate = tp.candidates[candidateId];
  if (!candidate) return null;

  const rng = RNGRegistry.getSystemRNG(world, "scouting", `materialize_${candidateId}`);
  const rikishi = promoteCandidateToRikishi({ candidate, heyaId, rng });

  // 1. Inject into world
  world.rikishi.set(rikishi.id, rikishi);

  // 2. Link to heya
  const heya = world.heyas.get(heyaId);
  if (heya) {
    if (!heya.rikishiIds) heya.rikishiIds = [];
    if (!heya.rikishiIds.includes(rikishi.id)) {
      heya.rikishiIds.push(rikishi.id);
    }
  }

  // 3. Remove from talent pool
  delete tp.candidates[candidateId];
  
  // Cleanup Visible/Hidden lists
  const pool = tp.pools[candidate.poolType as TalentPoolType];
  if (pool) {
    pool.candidatesVisible = pool.candidatesVisible.filter(id => id !== candidateId);
    pool.candidatesHidden = pool.candidatesHidden.filter(id => id !== candidateId);
  }

  // 4. Fire event
  EventBus.recruitDiscovered(world, {
    rikishiId: rikishi.id,
    heyaId: heyaId,
    shikona: rikishi.shikona,
    heya: heya?.name,
    status: "materialized"
  });

  return rikishi;
}

/**
 * Materializes all signed candidates in the world (e.g. at the start of a basho).
 */
export function materializeAllSignedCandidates(world: WorldState): void {
  const tp = world.talentPool;
  if (!tp) return;

  const signedIds = Object.values(tp.candidates)
    .filter(c => c.availabilityState === "signed")
    .map(c => c.candidateId);

  for (const cId of signedIds) {
    const candidate = tp.candidates[cId];
    const suitor = candidate?.competingSuitors?.[0];
    if (suitor) {
      materializeCandidateToRikishi(world, cId, suitor.heyaId);
    }
  }
}

function refreshAllPools(world: WorldState) {
  const tp = ensureTalentPoolState(world);
  const rng = RNGRegistry.getSystemRNG(
    world,
    "scouting",
    `refresh_${world.year}`,
  );

  const poolTypes: TalentPoolType[] = ["high_school", "university", "foreign"];
  poolTypes.forEach((pt) => {
    const pool = tp.pools[pt];
    // Fill until the hidden reserve cap
    const currentCount =
      pool.candidatesVisible.length + pool.candidatesHidden.length;
    const toGenerate = pool.hiddenReserveCap - currentCount;

    for (let i = 0; i < toGenerate; i++) {
      const id = rng.uuid('CD');
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

// ============================================
// INTERNAL HELPERS
// ============================================

export function fillHiddenCandidates(
  pool: TalentPoolState,
  tp: TalentPoolWorldState,
  targetCount: number,
  rng: SeededRNG,
  currentYear: number,
  poolType: TalentPoolType,
  idGenerator: (index: number) => string
): void {
  for (let i = 0; i < targetCount; i++) {
    const id = idGenerator(i);
    const candidate = generateCandidate({ id, rng, currentYear, poolType });
    tp.candidates[id] = candidate;
    pool.candidatesHidden.push(id);
  }
}


/**
 * Ensures the talent pool state is initialized.
 */
function ensureTalentPoolState(world: WorldState): TalentPoolWorldState {
  return EntityService.ensureState(world, "talentPool", () => ({
    version: "1.0.0",
    lastYearlyRefreshYear: world.year,
    candidates: {},
    pools: {
      high_school: createEmptyPool("high_school", world),
      university: createEmptyPool("university", world),
      foreign: createEmptyPool("foreign", world),
    },
    playerScouting: {},
  }));
}

function createEmptyPool(type: TalentPoolType, world: WorldState) {
  const rng = RNGRegistry.getSystemRNG(world, "scouting", `pool_init_${type}`);
  return {
    poolId: rng.uuid('PL'),
    poolType: type,
    refreshCadence: "basho" as const,
    populationCap: 20,
    hiddenReserveCap: 50,
    candidatesVisible: [],
    candidatesHidden: [],
    lastRefreshWeek: 0,
    scarcityBand: "normal" as const,
    qualityBand: "normal" as const,
  };
}

// ============================================
// MISSING FUNCTIONS (called by overflow.ts, npcAI.ts, tickYearly.ts)
// ============================================

/**
 * Returns true if a rikishi counts against the foreign-slot limit.
 */
export function countsAsForeignFromRikishi(rikishi: Rikishi): boolean {
  return (rikishi.nationality ?? "Japan") !== "Japan";
}

/**
 * Re-injects a rikishi back into the talent pool after roster overflow.
 * The rikishi becomes a free-agent candidate available to all stables.
 */
export function reinjectToTalentPool(
  world: WorldState,
  rikishi: Rikishi,
): void {
  const tp = ensureTalentPoolState(world);
  // Convert the rikishi to a lightweight candidate object and mark it available
  const rng = RNGRegistry.getSystemRNG(world, "scouting", `reinject_${rikishi.id}`);
  const id = rng.uuid('CD');
  const isForeginer = countsAsForeignFromRikishi(rikishi);
  const poolType: TalentPoolType = isForeginer ? "foreign" : "high_school";

  if (!tp.candidates[id]) {
    const birthYear = world.year - (rikishi.age ?? 20);
    tp.candidates[id] = {
      candidateId: id,
      personId: rikishi.id,
      name: rikishi.shikona ?? rikishi.name ?? id,
      nationality: rikishi.nationality ?? "Japan",
      birthYear,
      originRegion: "Japan",
      reputationSeed: 50,
      tags: ["reinjected"],
      combatProfile: {} as any,
      archetype: "balanced" as any,
      style: "neutral" as any,
      heightPotentialCm: 175,
      weightPotentialKg: 150,
      talentSeed: 50,
      temperament: { discipline: 50, volatility: 50 },
      visibilityBand: "public" as VisibilityBand,
      availabilityState: "available" as CandidateAvailabilityState,
      competingSuitors: [],
    };
    tp.pools[poolType].candidatesVisible.push(id);
  }

  EventBus.recruitDiscovered(world, {
    rikishiId: rikishi.id,
    shikona: rikishi.shikona ?? rikishi.name ?? id,
    status: "reinjected"
  });
}

/**
 * Annual talent pool maintenance:
 * - Age out stale candidates who have been available too long
 * - Inject a fresh cohort of prospects for the new year
 */
export function tickYear(world: WorldState): void {
  const tp = ensureTalentPoolState(world);
  const currentYear = world.year ?? 2025;
  const rng = RNGRegistry.getSystemRNG(
    world,
    "scouting",
    `yearly_refresh_${currentYear}`,
  );

  const poolTypes: TalentPoolType[] = ["high_school", "university", "foreign"];

  for (const poolType of poolTypes) {
    const pool = tp.pools[poolType];

    // 1. Age out stale candidates (estimate age from birthYear)
    const maxAge =
      poolType === "high_school" ? 20 : poolType === "university" ? 24 : 28;
    pool.candidatesVisible = filterAgedOutCandidates(
      pool.candidatesVisible,
      tp,
      currentYear,
      maxAge,
    );
    pool.candidatesHidden = filterAgedOutCandidates(
      pool.candidatesHidden,
      tp,
      currentYear,
      maxAge,
    );

    // 2. Inject fresh prospects for the new year
    const targetFill = Math.floor(pool.hiddenReserveCap * 0.6);
    const currentTotal =
      pool.candidatesVisible.length + pool.candidatesHidden.length;
    const toGenerate = Math.max(0, targetFill - currentTotal);

      fillHiddenCandidates(
        pool,
        tp,
        toGenerate,
        rng,
        currentYear,
        poolType,
        () => rng.uuid('CD')
      );
  }

  tp.lastYearlyRefreshYear = currentYear;
}

function filterAgedOutCandidates(
  candidateIds: Id[],
  tp: TalentPoolWorldState,
  currentYear: number,
  maxAge: number,
): Id[] {
  return candidateIds.filter((id) => {
    const candidate = tp.candidates[id];
    // Remove ghost IDs where candidate data is missing
    if (!candidate) return false;

    const estimatedAge = currentYear - (candidate.birthYear ?? currentYear - 20);
    if (estimatedAge > maxAge) {
      delete tp.candidates[id];
      return false;
    }
    return true;
  });
}
