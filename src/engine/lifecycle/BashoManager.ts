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

import { initializeBasho } from "../systems/generation/WorldFactory";
import { ensureDaySchedule } from "../schedule";
import type { WorldState } from "../types/world";
import type { BashoName, BashoState } from "../types/basho";
import { createImpactBuilder } from "../core/ImpactBuilder";
import type { StateImpact } from "../core/StateImpact";

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
 * @returns {StateImpact} State impact with basho state updates and queued BASHO_STATUS event.
 *
 * @example
 * ```ts
 * const impact = startBasho(world, "haru");
 * const resolved = resolveImpacts(world, [impact]);
 * console.log(resolved.cyclePhase); // "active_basho"
 * ```
 */
export function startBasho(world: WorldState, bashoName?: BashoName): StateImpact {
  if (world.cyclePhase === "active_basho") return createImpactBuilder("startBasho").build();

  const name: BashoName = bashoName || world.currentBashoName || "hatsu";

  // Initialize new basho state
  const basho = initializeBasho(world, name);

  // Ensure initial schedule is available
  const scheduleImpact = ensureDaySchedule(world, basho.day);

  // Build impact with world field updates and queued event
  const builder = createImpactBuilder("startBasho")
    .updateWorldField("currentBasho", basho)
    .updateWorldField("cyclePhase", "active_basho")
    .logEvent("BASHO_STATUS", "basho", {
      status: "started",
      incident: name,
      day: 1,
    }, { importance: "headline" });

  // Merge schedule impact
  builder.merge(scheduleImpact);

  return builder.build();
}
