/**
 * File Name: src/engine/rivalries.ts
 * Status: REFACTORED / SERVICE-ORIENTED
 * 
 * This is now a barrel file that orchestrates the Rivalry system.
 * Delegated to specialized sub-services in src/engine/systems/narrative/.
 * 
 * Goal: No monoliths, high-fidelity modularity.
 */

import { RivalryService } from "./systems/narrative/RivalryService";
import { WorldState } from "./types/world";
import type { Id } from "./types/common";
import type { RivalriesState, RivalryPairState, RivalryKey } from "./systems/narrative/RivalryConstants";

// --- AUTHORITATIVE DELEGATION ---
export * from "./systems/narrative/RivalryConstants";
export * from "./systems/narrative/RivalryHeatService";
export * from "./systems/narrative/RivalryService";
export type { RivalryHeatBand } from "./systems/narrative/NarrativeBands";

/**
 * Create a fresh empty rivalries state (Legacy standalone).
 */
export function createDefaultRivalriesState(): RivalriesState {
  return { version: "1.0.0", pairs: {} };
}

/**
 * Canonical pair key generator (Legacy standalone).
 */
export function makeRivalryKey(aId: Id, bId: Id): RivalryKey {
  return RivalryService.makeRivalryKey(aId, bId);
}

/**
 * Look up a rivalry pair (Legacy standalone).
 */
export function getRivalry(state: RivalriesState, aId: Id, bId: Id): RivalryPairState | undefined {
  const key = makeRivalryKey(aId, bId);
  return state.pairs[key];
}

/**
 * Insert or update a rivalry pair (Legacy standalone).
 */
export function upsertRivalry(state: RivalriesState, pair: RivalryPairState): void {
  state.pairs[pair.key] = pair;
}

/**
 * Handle bout resolution for rivalries (Legacy wrapper).
 */
export function onBoutResolvedRivalries(world: WorldState, context: any): void {
  RivalryService.onBoutResolved(world, { 
    result: context.result, 
    day: context.match?.day 
  });
}

/**
 * Weekly tick for rivalries (Legacy wrapper).
 */
export function tickWeekRivalries(world: WorldState): void {
  RivalryService.applyWeeklyDecay(world);
}

// Re-export type definitions for backward compatibility
export type { 
  RivalriesState, 
  RivalryPairState, 
  RivalryKey, 
  RivalryTone, 
  RivalryTrigger 
} from "./systems/narrative/RivalryConstants";