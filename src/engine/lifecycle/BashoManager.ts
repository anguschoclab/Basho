/**
 * src/engine/lifecycle/BashoManager.ts
 * =====================================
 * Basho Manager
 *
 * Responsibilities:
 * - Start basho tournaments
 * - Get current basho state
 * - Initialize day schedules
 * - Handle phase transitions to active_basho
 *
 * @see initializeBasho for basho state initialization
 * @see ensureDaySchedule for day schedule management
 */

import { EventBus } from "../events";
import { initializeBasho } from "../systems/generation/WorldFactory";
import { ensureDaySchedule } from "../schedule";
import type { WorldState } from "../types/world";
import type { BashoName, BashoState } from "../types/basho";
import { resolveImpacts } from "../core/ImpactResolver";

/**
 * Get current basho state.
 * Returns the currently active basho or undefined if no basho is active.
 *
 * @param {WorldState} world - The world state.
 * @returns {BashoState | undefined} The current basho state.
 *
 * @example
 * ```ts
 * const basho = getCurrentBasho(world);
 * if (basho) console.log(`Day ${basho.day} of ${basho.bashoName}`);
 * ```
 */
export function getCurrentBasho(world: WorldState): BashoState | undefined {
  return world.currentBasho;
}

/**
 * Start basho — handles the transition from pre-basho/interim to active_basho.
 * Canonically initializes the tournament state and day 1 schedule.
 *
 * Algorithm:
 * 1. Check if already in active_basho (no-op if true)
 * 2. Determine basho name (use provided or world default)
 * 3. Initialize new basho state
 * 4. Set cycle phase to active_basho
 * 5. Ensure initial day 1 schedule is available
 * 6. Emit basho status event
 *
 * @param {WorldState} world - Current world state.
 * @param {BashoName} [bashoName] - Optional basho name override.
 * @returns {WorldState} Updated world state with active basho.
 *
 * @example
 * ```ts
 * const updatedWorld = startBasho(world, "haru");
 * console.log(updatedWorld.cyclePhase); // "active_basho"
 * ```
 */
export function startBasho(world: WorldState, bashoName?: BashoName): WorldState {
  if (world.cyclePhase === "active_basho") return world;

  const name: BashoName = bashoName || world.currentBashoName || "hatsu";

  // Initialize new basho state
  const basho = initializeBasho(world, name);

  world.currentBasho = basho;
  world.cyclePhase = "active_basho";

  // Ensure initial schedule is available
  const scheduleImpact = ensureDaySchedule(world, basho.day);
  const resolvedWorld = resolveImpacts(world, [scheduleImpact]);
  Object.assign(world, resolvedWorld);

  EventBus.bashoStatus(world, {
    status: "started",
    incident: name,
    day: 1,
  });
  return world;
}
