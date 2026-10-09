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
import type { MatchSchedule, BoutResult } from "./types/basho";
import type { Rikishi } from "./types/rikishi";
import type { RivalriesState, RivalryPairState } from "../constants/engine/rivalry";
import type { StateImpact } from "./core/StateImpact";
import { makeRivalryKey } from "./systems/narrative/rivalry/state";

// --- AUTHORITATIVE DELEGATION ---
export * from "../constants/engine/rivalry";
export * from "./systems/narrative/RivalryHeatService";
export * from "./systems/narrative/RivalryService";
export type { RivalryHeatBand } from "./systems/narrative/NarrativeBands";
export { makeRivalryKey };

/**
 * Create a fresh empty rivalries state (Legacy standalone).
 */
export function createDefaultRivalriesState(): RivalriesState {
  return { version: "1.0.0", pairs: {} };
}

/**
 * Look up a rivalry pair (Legacy standalone).
 */
export function getRivalry(state: RivalriesState, aId: Id, bId: Id): RivalryPairState | undefined {
  const key = makeRivalryKey(aId, bId);
  return state.pairs[key];
}

/**
 * Handle bout resolution for rivalries (Legacy wrapper).
 * Returns StateImpact describing rivalry updates.
 */
export function onBoutResolvedRivalries(
  world: WorldState,
  context: { match: MatchSchedule; result: BoutResult; east: Rikishi; west: Rikishi }
): StateImpact {
  return RivalryService.onBoutResolved(world, {
    result: context.result,
    day: context.match?.day,
  });
}

// Re-export type definitions for backward compatibility
export type {
  RivalriesState,
  RivalryPairState,
  RivalryKey,
  RivalryTone,
  RivalryTrigger,
} from "../constants/engine/rivalry";
