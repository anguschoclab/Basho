/**
 * TalentPoolScouting.ts — Read operators and fog-of-war scouting logic.
 * Covers candidate visibility queries, scouting intel management, and
 * attribute revelation through the FogOfWar confidence system.
 */

import { RNGRegistry } from "../../core/RNGRegistry";
import { WorldState } from "../../types/world";
import { Id } from "../../types/common";
import { TalentPoolType, TalentCandidate } from "../../types/talent";
import { getConfidenceLevel, resolveScoutedAttribute } from "../recruitment/FogOfWarService";
import { clampInt } from "../../utils/math";
import { isForeign } from "../../utils/identity";
import { ensureTalentPoolState } from "./TalentPoolStateService";

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

  return pool.candidatesVisible.map((id) => tp.candidates[id]).filter(Boolean);
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
): { revealed: Id[] } {
  const tp = ensureTalentPoolState(world);
  const pool = tp.pools[poolType];
  if (!pool || pool.candidatesHidden.length === 0) return { revealed: [] };

  const rng = RNGRegistry.getSystemRNG(world, "scouting", `reveal_${poolType}_${world.week}`);
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
    tp.playerScouting[candidateId] = {
      scoutingLevel: 0,
      lastScoutedWeek: world.week,
    };
  }

  const record = tp.playerScouting[candidateId];
  const rng = RNGRegistry.getSystemRNG(world, "scouting", `intel_${candidateId}_${world.week}`);

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
 * Resolves a candidate's attributes into confidence-gated scouted values.
 * Potential stats are harder to scout than combat stats (potential confidence
 * is shifted down one tier inside FogOfWarService).
 */
export function getScoutedCandidateView(world: WorldState, candidateId: Id) {
  const tp = ensureTalentPoolState(world);
  const candidate = tp.candidates[candidateId];
  if (!candidate) return null;

  const level = tp.playerScouting?.[candidateId]?.scoutingLevel ?? 0;
  const observations = Math.floor(level / 20);
  const seed = `candidate-${candidateId}-${level}`;

  const resolveCombat = (name: string, value: number) => {
    const conf = getConfidenceLevel(level, false, observations, "combat");
    return resolveScoutedAttribute(name, value, conf, `${seed}-${name}`);
  };
  const resolvePotential = (name: string, value: number) => {
    const conf = getConfidenceLevel(level, false, observations, "potential");
    return resolveScoutedAttribute(name, value, conf, `${seed}-pa-${name}`);
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
          strength: resolvePotential("strength", candidate.potentialStats.strength),
          speed: resolvePotential("speed", candidate.potentialStats.speed),
          technique: resolvePotential("technique", candidate.potentialStats.technique),
          balance: resolvePotential("balance", candidate.potentialStats.balance),
          stamina: resolvePotential("stamina", candidate.potentialStats.stamina),
          mental: resolvePotential("mental", candidate.potentialStats.mental),
          adaptability: resolvePotential("adaptability", candidate.potentialStats.adaptability),
        }
      : undefined,
    // Development profile only at deep scouting (≥90)
    developmentProfile: level >= 90 ? candidate.developmentProfile : undefined,
    // Archetype + style always visible once known
    archetype: candidate.archetype,
    style: candidate.style,
    temperament: candidate.temperament,
  };
}
