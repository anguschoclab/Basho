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

// --- AUTHORITATIVE DELEGATION ---
export * from "./systems/narrative/RivalryConstants";
export * from "./systems/narrative/RivalryHeatService";
export * from "./systems/narrative/RivalryService";

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