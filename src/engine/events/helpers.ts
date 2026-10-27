/**
 * eventHelpers.ts
 *
 * Helper functions for event generation.
 */

import { rngFromSeed } from "@/engine/core/rng";
import type { WorldState } from "@/engine/types/world";

export function createRngForEvent(world: WorldState, seedPrefix: string) {
  return rngFromSeed(`${seedPrefix}-${world.year}-${world.week}`, "narrative", "event");
}
