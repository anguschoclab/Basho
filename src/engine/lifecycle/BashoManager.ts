import { EventBus } from "../events";
import { initializeBasho } from "../systems/generation/WorldFactory";
import { ensureDaySchedule } from "../schedule";
import type { WorldState } from "../types/world";
import type { BashoName, BashoState } from "../types/basho";
import { resolveImpacts } from "../core/ImpactResolver";

/**
 * Get current basho.
 *  * @param world - The World.
 *  * @returns The result.
 */
export function getCurrentBasho(world: WorldState): BashoState | undefined {
  return world.currentBasho;
}

/**
 * Start basho — handles the transition from pre-basho/interim to active_basho.
 * Canonically initializes the tournament state and day 1 schedule.
 * 
 * @param world Current WorldState
 * @param bashoName Optional name if overriding the world's default
 * @returns Updated WorldState
 */
export function startBasho(world: WorldState, bashoName?: BashoName): WorldState {
  if (world.cyclePhase === "active_basho") return world;

  const name: BashoName =
    bashoName || world.currentBashoName || "hatsu";

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
    day: 1
  });
  return world;
}
