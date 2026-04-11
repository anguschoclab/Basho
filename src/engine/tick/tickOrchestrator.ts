/**
 * src/engine/tick/tickOrchestrator.ts
 * =====================================
 * Entry points for tick execution used by the UI slices and the web worker.
 */

import type { WorldState } from "../types/world";
import { advanceOneDay } from "./tickDaily";

/**
 * Deep-clones a WorldState so tick mutations don't affect the original.
 * Uses structuredClone, which correctly handles Map and Set instances.
 */
export function cloneWorldForTick(world: WorldState): WorldState {
  return structuredClone(world) as WorldState;
}

/**
 * Advances the world by one day (clone → mutate → return).
 * Used by the web worker to process ticks off the main thread.
 */
export function tickOrchestrator(world: WorldState): WorldState {
  const next = cloneWorldForTick(world);
  return advanceOneDay(next);
}
