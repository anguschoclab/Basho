// @ts-nocheck
/**
 * src/engine/core/RNGRegistry.ts
 * ==============================
 * Unified RNG provider for Sumo Manager Pro.
 *
 * Centralizes all seeded randomness to ensure:
 * 1. Cross-system determinism (same seed = same simulation).
 * 2. Predictable behavior across Web Workers and UI.
 * 3. Eliminates redundant seeding boilerplate in subsystems.
 */

import { rngFromSeed, type SeededRNG } from "../rng";
import type { WorldState } from "../types/world";

/**
 * Common system keys for RNG seeding.
 */
export type SystemRNGKey =
  | "training"
  | "scouting"
  | "rivalry"
  | "media"
  | "governance"
  | "economics"
  | "combat"
  | "kensho"
  | "health"
  | "lifecycle";

/**
 * Unified RNG registry.
 */
export const RNGRegistry = {
  /**
   * Get a seeded RNG for a specific system and cadence.
   *
   * @param world - The current WorldState.
   * @param system - The system key.
   * @param cadence - Optional sub-context (e.g., "week::12" or "rikishi::d8e4").
   */
  getSystemRNG(world: WorldState, system: SystemRNGKey, cadence?: string): SeededRNG {
    const seed = world.seed || "sumo-manager-pro";
    const cadenceKey = cadence ? `::${cadence}` : "";
    return rngFromSeed(seed, system, `${system}${cadenceKey}`);
  },

  /**
   * Shorthand for training RNG.
   */
  getTrainingRNG(world: WorldState): SeededRNG {
    return this.getSystemRNG(world, "training", `week::${world.calendar.currentWeek || 0}`);
  },

  /**
   * Shorthand for scouting RNG.
   */
  getScoutingRNG(world: WorldState): SeededRNG {
    return this.getSystemRNG(world, "scouting", `week::${world.calendar.currentWeek || 0}`);
  },
};
