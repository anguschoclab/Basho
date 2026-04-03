/**
 * File Name: src/engine/scouting.ts
 * Status: REFACTORED / SERVICE-ORIENTED
 * 
 * This is now a barrel file that orchestrates the Scouting system.
 * Delegated to specialized sub-services in src/engine/systems/recruitment/.
 * 
 * Goal: No monoliths, high-fidelity modularity.
 */

import type { Rikishi } from "./types/rikishi";
import { ScoutingService } from "./systems/recruitment/ScoutingService";
import type { ScoutedRikishi } from "./systems/recruitment/ScoutingService";
import { calculateScoutingLevel } from "./systems/recruitment/FogOfWarService";
import type { ScoutingInvestment } from "./systems/recruitment/RecruitmentConstants";

// --- AUTHORITATIVE DELEGATION ---
export * from "./systems/recruitment/RecruitmentConstants";
export * from "./systems/recruitment/FogOfWarService";
export * from "./systems/recruitment/ScoutingService";

/**
 * Record observation (Legacy wrapper).
 */
export function recordObservation(scouted: any, currentWeek: number) {
  return ScoutingService.recordObservation(scouted, currentWeek);
}

/**
 * Get numerical scouting level (Legacy wrapper).
 */
export function getScoutingLevel(isOwned: boolean, observations: number, investment: any) {
  return calculateScoutingLevel(isOwned, observations, investment);
}

/**
 * Create a scouted view for a rikishi (Legacy standalone wrapper).
 * Uses currentWeek directly instead of requiring a full WorldState.
 */
export function createScoutedView(
  rikishi: Rikishi,
  playerHeyaId: string | null,
  observations: number,
  investment: ScoutingInvestment,
  currentWeek: number
): ScoutedRikishi {
  const isOwned = rikishi.heyaId === playerHeyaId;
  const level = calculateScoutingLevel(isOwned, observations, investment);
  return {
    rikishiId: rikishi.id,
    publicInfo: {
      id: rikishi.id,
      shikona: rikishi.shikona,
      heyaId: rikishi.heyaId,
      rank: rikishi.rank,
      rankNumber: rikishi.rankNumber || 1,
      side: rikishi.side || "east",
      height: rikishi.height,
      weight: rikishi.weight,
      currentBashoWins: (rikishi as any).currentBashoWins || 0,
      currentBashoLosses: (rikishi as any).currentBashoLosses || 0,
      style: rikishi.style,
      archetype: rikishi.archetype
    },
    isOwned,
    timesObserved: observations,
    lastObservedWeek: currentWeek,
    scoutingInvestment: investment,
    scoutingLevel: level,
    attributes: {
      power: rikishi.power || 50,
      speed: rikishi.speed || 50,
      balance: rikishi.balance || 50,
      technique: rikishi.technique || 50,
      aggression: rikishi.aggression || 50,
      experience: rikishi.experience || 50
    }
  };
}

/**
 * Get displayable attributes for a scouted rikishi (Legacy standalone wrapper).
 */
export function getScoutedAttributes(scouted: ScoutedRikishi, seed?: string) {
  return ScoutingService.getScoutedAttributes(scouted, seed);
}

/**
 * Human-readable scouting level label (Legacy standalone wrapper).
 */
export function describeScoutingLevel(level: number) {
  return ScoutingService.describeScoutingLevel(level);
}

// Re-export type definitions for backward compatibility
export type {
  PublicRikishiInfo,
  ScoutedRikishi,
  ScoutedAttributeTruthSnapshot
} from "./systems/recruitment/ScoutingService";