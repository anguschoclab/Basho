/**
 * TalentPoolScouting.ts — Read operators and fog-of-war scouting logic.
 * Covers candidate visibility queries, scouting intel management, and
 * attribute revelation through the FogOfWar confidence system.
 */

import { RNGRegistry } from "../../core/RNGRegistry";
import { createImpactBuilder } from "../../core/ImpactBuilder";
import type { StateImpact } from "../../core/StateImpact";
import { WorldState } from "../../types/world";
import { Id } from "../../types/common";
import { TalentPoolType, TalentCandidate } from "../../types/talent";
import {
  getConfidenceLevel,
  resolveScoutedAttribute,
  applyBias,
  decayBias,
  type ScoutingBias,
} from "../recruitment/FogOfWarService";
import { clampInt } from "../../utils/math";
import { isForeign } from "../../utils/identity";
import { ensureTalentPoolState } from "./TalentPoolStateService";
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

  // ⚡ Bolt Optimization: Replace chained .map().filter() with a single for...of loop
  // to prevent intermediate array allocations and O(N) iteration overhead.
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

// ============================================
// MUTATION OPERATORS — SCOUTING
// ============================================

/**
 * Reveals a hidden candidate from the reserve into the visible list.
 */
export function scoutPool(
  world: WorldState,
  poolType: TalentPoolType,
  options: { revealCount: number } = { revealCount: 1 }
): { revealed: Id[]; impact: StateImpact } {
  const builder = createImpactBuilder("scoutPool");
  const tp = world.talentPool;
  if (!tp) return { revealed: [], impact: builder.build() };

  const pool = tp.pools[poolType];
  if (!pool || pool.candidatesHidden.length === 0) return { revealed: [], impact: builder.build() };

  const rng = RNGRegistry.getSystemRNG(world, "scouting", `reveal_${poolType}_${world.week}`);
  const count = Math.min(options.revealCount, pool.candidatesHidden.length);

  const nextCandidatesHidden = [...pool.candidatesHidden];
  const nextCandidatesVisible = [...pool.candidatesVisible];
  const nextCandidates = { ...tp.candidates };
  const revealed: Id[] = [];

  for (let i = 0; i < count; i++) {
    const idx = rng.int(0, nextCandidatesHidden.length - 1);
    const id = nextCandidatesHidden.splice(idx, 1)[0];
    nextCandidatesVisible.push(id);
    revealed.push(id);

    // Set initial visibility band
    const c = nextCandidates[id];
    if (c) {
      nextCandidates[id] = { ...c, visibilityBand: "rumored" };
    }
  }

  const nextPools = {
    ...tp.pools,
    [poolType]: {
      ...pool,
      candidatesHidden: nextCandidatesHidden,
      candidatesVisible: nextCandidatesVisible,
    },
  };

  builder.updateWorldField("talentPool", {
    ...tp,
    candidates: nextCandidates,
    pools: nextPools,
  });

  return { revealed, impact: builder.build() };
}

/**
 * Increases intelligence on a specific candidate.
 */
export function scoutCandidate(
  world: WorldState,
  candidateId: Id,
  options: { effort: number } = { effort: 1 }
): { ok: boolean; scoutingLevel: number; impact: StateImpact } {
  const builder = createImpactBuilder("scoutCandidate");
  const tp = world.talentPool;
  if (!tp) return { ok: false, scoutingLevel: 0, impact: builder.build() };

  const candidate = tp.candidates[candidateId];
  if (!candidate) return { ok: false, scoutingLevel: 0, impact: builder.build() };

  const nextPlayerScouting = { ...(tp.playerScouting || {}) };
  if (!nextPlayerScouting[candidateId]) {
    nextPlayerScouting[candidateId] = {
      scoutingLevel: 0,
      lastScoutedWeek: world.week,
    };
  }

  const record = { ...nextPlayerScouting[candidateId] };
  const rng = RNGRegistry.getSystemRNG(world, "scouting", `intel_${candidateId}_${world.week}`);

  const gain = (10 + rng.int(0, 15)) * options.effort;
  record.scoutingLevel = clampInt(record.scoutingLevel + gain, 0, 100);
  record.lastScoutedWeek = world.week;

  nextPlayerScouting[candidateId] = record;

  const nextCandidates = { ...tp.candidates };
  const nextCandidate = { ...candidate };

  // If intel high enough, improve visibility band
  if (record.scoutingLevel >= 70) nextCandidate.visibilityBand = "public";
  else if (record.scoutingLevel >= 30 && candidate.visibilityBand === "hidden") {
    nextCandidate.visibilityBand = "obscure";
  }
  nextCandidates[candidateId] = nextCandidate;

  builder.updateWorldField("talentPool", {
    ...tp,
    playerScouting: nextPlayerScouting,
    candidates: nextCandidates,
  });

  return { ok: true, scoutingLevel: record.scoutingLevel, impact: builder.build() };
}

/**
 * Resolves a candidate's attributes into confidence-gated scouted values.
 * Potential stats are harder to scout than combat stats (potential confidence
 * is shifted down one tier inside FogOfWarService).
 *
 * Applies scouting bias to potential stats when bias decayFactor > 0, making
 * initial stat readings inaccurate until observations accumulate and bias decays.
 *
 * @param world - Current world state
 * @param candidateId - Candidate identifier to scout
 * @returns Scouted candidate view with biased potential stats and bias metadata
 */
export function getScoutedCandidateView(world: WorldState, candidateId: Id) {
  const tp = ensureTalentPoolState(world);
  const candidate = tp.candidates[candidateId];
  if (!candidate) return null;

  let level = tp.playerScouting?.[candidateId]?.scoutingLevel ?? 0;

  // Phase 5 Depth: Academy Advanced Discovery
  if (world.playerHeyaId && isForeign(candidate)) {
    const heya = getHeya(world, world.playerHeyaId);
    const presence = heya?.regionalPresence?.[candidate.originRegion] || 0;
    if (presence >= 80) {
      // Academy bonus: reveal more intel automatically (+30 effective scouting)
      level = Math.min(100, level + 30);
    }
  }

  const observations = Math.floor(level / 20);
  const bias = candidate.scoutingBias;
  const decayedBias = bias ? decayBias(bias, observations) : null;
  const seed = `candidate-${candidateId}-${level}`;

  const resolveCombat = (name: string, value: number) => {
    const conf = getConfidenceLevel(level, false, observations, "combat");
    return resolveScoutedAttribute(name, value, conf, `${seed}-${name}`);
  };

  const resolvePotential = (
    name: string,
    value: number,
    statKey: keyof ScoutingBias["statOffsets"]
  ) => {
    const conf = getConfidenceLevel(level, false, observations, "potential");
    // Apply bias if decayFactor > 0
    const biasedValue =
      decayedBias && decayedBias.decayFactor > 0
        ? applyBias(value, decayedBias.statOffsets[statKey], decayedBias.decayFactor)
        : value;
    return resolveScoutedAttribute(name, biasedValue, conf, `${seed}-pa-${name}`);
  };

  return {
    candidateId,
    scoutingLevel: level,
    visibility: candidate.visibilityBand,
    // Physical size potential — revealed with combat-tier confidence (easier to eyeball)
    heightPotential: resolveCombat("height potential", candidate.heightPotentialCm),
    weightPotential: resolveCombat("weight potential", candidate.weightPotentialKg),
    // Hidden skill potential — gated by potential-tier confidence
    potentialStats: candidate.potentialStats
      ? {
          power: resolvePotential("power", candidate.potentialStats.power, "power"),
          speed: resolvePotential("speed", candidate.potentialStats.speed, "speed"),
          technique: resolvePotential("technique", candidate.potentialStats.technique, "technique"),
          balance: resolvePotential("balance", candidate.potentialStats.balance, "balance"),
          stamina: resolvePotential("stamina", candidate.potentialStats.stamina, "stamina"),
          mental: resolvePotential("mental", candidate.potentialStats.mental, "mental"),
          adaptability: resolvePotential(
            "adaptability",
            candidate.potentialStats.adaptability,
            "adaptability"
          ),
        }
      : undefined,
    // Development profile only at deep scouting (≥90)
    developmentProfile: level >= 90 ? candidate.developmentProfile : undefined,
    // Archetype + style always visible once known
    archetype: candidate.archetype,
    style: candidate.style,
    temperament: candidate.temperament,
    // ADD BIAS METADATA FOR UI
    hasBias: (decayedBias?.decayFactor ?? 0) > 0,
    biasStrength: decayedBias?.decayFactor ?? 0,
  };
}
