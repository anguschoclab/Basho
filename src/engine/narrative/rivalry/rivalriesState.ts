/**
 * File Name: src/engine/rivalries.ts
 * Status: REFACTORED / SERVICE-ORIENTED
 *
 * This is now a barrel file that orchestrates the Rivalry system.
 * Delegated to specialized sub-services in src/engine/systems/narrative/.
 *
 * Goal: No monoliths, high-fidelity modularity.
 */

import { WorldState } from "@/engine/types/world";
import type { Id } from "@/engine/types/common";
import type { MatchSchedule, BoutResult } from "@/engine/types/basho";
import type { Rikishi } from "@/engine/types/rikishi";
import type { RivalriesState, RivalryPairState } from "@/constants/engine/rivalry";
import type { StateImpact } from "@/engine/core/StateImpact";
import { makeRivalryKey } from "@/engine/narrative/rivalry/state";
import { RivalryService } from "@/engine/narrative/RivalryService";

// --- AUTHORITATIVE DELEGATION ---

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
} from "@/constants/engine/rivalry";
