/**
 * src/engine/tick/tickOrchestrator.ts
 * =====================================
 * Entry points for tick execution used by the UI slices and the web worker.
 */

import type { WorldState } from "../types/world";
import { advanceOneDay, advanceDaysFast } from "./tickDaily";

/**
 * Deep-clones a WorldState so tick mutations don't affect the original state.
 * Uses `structuredClone`, which correctly handles Map and Set instances.
 *
 * @param {WorldState} world - The world state to clone.
 * @returns {WorldState} A deep clone of the world state.
 */
export function cloneWorldForTick(world: WorldState): WorldState {
  return structuredClone(world) as WorldState;
}

/**
 * Advances the world state by one day (clone → mutate → return).
 * Used by the web worker to process ticks off the main thread to avoid UI blocking.
 *
 * @param {WorldState} world - The current world state.
 * @returns {WorldState} The new world state after advancing one day.
 */
export function tickOrchestrator(world: WorldState): WorldState {
  const next = cloneWorldForTick(world);
  return advanceOneDay(next);
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
  const next = cloneWorldForTick(world);
  return advanceDaysFast(next, days);
}
