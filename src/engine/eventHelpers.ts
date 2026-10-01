/**
 * eventHelpers.ts
 *
 * Helper functions for event generation.
 */

import { rngFromSeed } from "./rng";
import type { WorldState } from "./types/world";

export function createRngForEvent(world: WorldState, seedPrefix: string) {
  return rngFromSeed(`${seedPrefix}-${world.year}-${world.week}`, "narrative", "event");
}
