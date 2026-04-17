/**
 * entityAccess.ts
 *
 * Utility functions for safe entity access from WorldState.
 * Eliminates duplicate patterns of world.heyas.get() and world.rikishi.get().
 */

import type { Id } from "../types/common";
import type { WorldState } from "../types/world";
import type { Heya } from "../types/heya";
import type { Rikishi } from "../types/rikishi";

/**
 * Safely get a Heya by ID from WorldState.
 * @param world - The WorldState to search
 * @param id - The Heya ID to retrieve
 * @returns The Heya if found, undefined otherwise
 */
export function getHeya(world: WorldState, id: Id): Heya | undefined {
  return world.heyas.get(id);
}

/**
 * Get a Heya by ID or throw an error if not found.
 * @param world - The WorldState to search
 * @param id - The Heya ID to retrieve
 * @returns The Heya
 * @throws Error if Heya not found
 */
export function getHeyaOrThrow(world: WorldState, id: Id): Heya {
  const heya = world.heyas.get(id);
  if (!heya) {
    throw new Error(`Heya with id ${id} not found`);
  }
  return heya;
}

/**
 * Safely get a Rikishi by ID from WorldState.
 * @param world - The WorldState to search
 * @param id - The Rikishi ID to retrieve
 * @returns The Rikishi if found, undefined otherwise
 */
export function getRikishi(world: WorldState, id: Id): Rikishi | undefined {
  return world.rikishi.get(id);
}

/**
 * Get a Rikishi by ID or throw an error if not found.
 * @param world - The WorldState to search
 * @param id - The Rikishi ID to retrieve
 * @returns The Rikishi
 * @throws Error if Rikishi not found
 */
export function getRikishiOrThrow(world: WorldState, id: Id): Rikishi {
  const rikishi = world.rikishi.get(id);
  if (!rikishi) {
    throw new Error(`Rikishi with id ${id} not found`);
  }
  return rikishi;
}

/**
 * Get all Rikishi belonging to a Heya.
 * @param world - The WorldState to search
 * @param heyaId - The Heya ID
 * @returns Array of Rikishi in the Heya
 */
export function getHeyaRikishi(world: WorldState, heyaId: Id): Rikishi[] {
  const heya = world.heyas.get(heyaId);
  if (!heya) return [];

  return (heya.rikishiIds || [])
    .map((id) => world.rikishi.get(id))
    .filter((r): r is Rikishi => r !== undefined);
}

/**
 * Get all active Rikishi in the world.
 * @param world - The WorldState to search
 * @returns Array of active (non-retired) Rikishi
 */
export function getActiveRikishi(world: WorldState): Rikishi[] {
  return Array.from(world.rikishi.values()).filter((r) => !r.isRetired);
}
