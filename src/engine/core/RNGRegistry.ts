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
 * These keys are used to namespace RNG calls for different simulation systems.
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
 * Provides centralized, deterministic RNG access for all simulation systems.
 */
export const RNGRegistry = {
  /**
   * Get a seeded RNG for a specific system and cadence.
   * Combines the world seed with the system key and optional cadence to create
   * a deterministic RNG instance that produces consistent results across runs.
   *
   * @param {WorldState} world - The current WorldState.
   * @param {SystemRNGKey} system - The system key (e.g., "training", "scouting").
   * @param {string} [cadence] - Optional sub-context (e.g., "week::12" or "rikishi::d8e4").
   * @returns {SeededRNG} A seeded RNG instance for deterministic random number generation.
   *
   * @example
   * ```ts
   * const rng = RNGRegistry.getSystemRNG(world, "training", "week::12");
   * const randomValue = rng.next();
   * ```
   */
  getSystemRNG(world: WorldState, system: SystemRNGKey, cadence?: string): SeededRNG {
    const seed = world.seed || "sumo-manager-pro";
    const cadenceKey = cadence ? `::${cadence}` : "";
    return rngFromSeed(seed, system, `${system}${cadenceKey}`);
  },

  /**
   * Shorthand for training RNG.
   * Automatically uses the current week as the cadence.
   *
   * @param {WorldState} world - The current WorldState.
   * @returns {SeededRNG} A seeded RNG instance for training system.
   *
   * @example
   * ```ts
   * const trainingRng = RNGRegistry.getTrainingRNG(world);
   * const growthBonus = trainingRng.next();
   * ```
   */
  getTrainingRNG(world: WorldState): SeededRNG {
    return this.getSystemRNG(world, "training", `week::${world.calendar.currentWeek || 0}`);
  },

  /**
   * Shorthand for scouting RNG.
   * Automatically uses the current week as the cadence.
   *
   * @param {WorldState} world - The current WorldState.
   * @returns {SeededRNG} A seeded RNG instance for scouting system.
   *
   * @example
   * ```ts
   * const scoutingRng = RNGRegistry.getScoutingRNG(world);
   * const candidateStat = scoutingRng.next();
   * ```
   */
  getScoutingRNG(world: WorldState): SeededRNG {
    return this.getSystemRNG(world, "scouting", `week::${world.calendar.currentWeek || 0}`);
  },
};
