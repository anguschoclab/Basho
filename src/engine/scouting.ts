/**
 * File Name: src/engine/scouting.ts
 * Status: REFACTORED / SERVICE-ORIENTED
 * 
 * This is now a barrel file that orchestrates the Scouting system.
 * Delegated to specialized sub-services in src/engine/systems/recruitment/.
 * 
 * Goal: No monoliths, high-fidelity modularity.
 */

import { ScoutingService } from "./systems/recruitment/ScoutingService";
import { calculateScoutingLevel } from "./systems/recruitment/FogOfWarService";

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

// Re-export type definitions for backward compatibility
export type { 
  PublicRikishiInfo, 
  ScoutedRikishi, 
  ScoutedAttributeTruthSnapshot 
} from "./systems/recruitment/ScoutingService";
/**
 * Legacy wrappers for missing exports.
 */
export function createScoutedView(truth: any, heyaId: string, obs: number, inv: any, week: number) {
  return ScoutingService.createScoutedView(truth, heyaId, obs, inv, week);
}
export function describeScoutingLevel(level: number) {
  return ScoutingService.describeScoutingLevel(level);
}
export function getScoutedAttributes(scouted: any, seed?: string) {
  return ScoutingService.getScoutedAttributes(scouted, seed);
}
