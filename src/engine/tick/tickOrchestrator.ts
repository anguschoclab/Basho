/**
 * src/engine/tick/tickOrchestrator.ts
 * =====================================
 * Entry points for tick execution used by the UI slices and the web worker.
 */

import type { WorldState } from "@/engine/types/world";
import { advanceOneDay, advanceDaysFast } from "@/engine/tick/tickDaily";

/**
 * Advances the world state by one day.
 * Used by the web worker to process ticks off the main thread to avoid UI blocking.
 *
 * @param {WorldState} world - The current world state.
 * @returns {WorldState} The new world state after advancing one day.
 */
export function tickOrchestrator(world: WorldState): WorldState {
  return advanceOneDay(world);
}

/**
 * Advances the world state by multiple days using fast-forward (skips daily micro-phases).
 * Used by the web worker for bulk advances without UI blocking.
 *
 * @param {WorldState} world - The current world state.
 * @param {number} days - Number of days to advance.
 * @returns {WorldState} The new world state after advancing N days.
 */
export function advanceDaysFastOrchestrator(world: WorldState, days: number): WorldState {
  return advanceDaysFast(world, days);
}
