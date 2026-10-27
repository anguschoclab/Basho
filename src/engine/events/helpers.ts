/**
 * eventHelpers.ts
 *
 * Helper functions for event generation.
 */

import { rngFromSeed } from "@/engine/rng";
import type { WorldState } from "@/engine/types/world";

export function createRngForEvent(world: WorldState, seedPrefix: string) {
  return rngFromSeed(`${seedPrefix}-${world.year}-${world.week}`, "narrative", "event");
}
