/**
 * collectionOperations.ts
 *
 * Utility functions for common collection operations.
 * Eliminates duplicate patterns of map().filter() chains.
 */

import type { Id } from "../types/common";
import type { WorldState } from "../types/world";
import type { Rikishi } from "../types/rikishi";
import type { Heya } from "../types/heya";
import type { Oyakata } from "../types/oyakata";

/**
 * Map an array of IDs to their corresponding entities from a Map.
 * @param ids - Array of entity IDs
 * @param entityMap - Map of ID to entity
 * @returns Array of entities (undefined for missing IDs filtered out)
 */
export function mapIdsToEntities<T>(ids: Id[], entityMap: Map<Id, T>): T[] {
  // ⚡ Bolt Optimization: Use a single for...of loop instead of chained .map().filter()
  const results: T[] = [];
  for (const id of ids) {
    const entity = entityMap.get(id);
    if (entity !== undefined) {
      results.push(entity);
    }
  }
  return results;
}

/**
 * Map an array of Rikishi IDs to their Rikishi objects from WorldState.
 * @param world - The WorldState
 * @param ids - Array of Rikishi IDs
 * @returns Array of Rikishi objects
 */
export function mapIdsToRikishi(world: WorldState, ids: Id[]): Rikishi[] {
  return mapIdsToEntities(ids, world.rikishi);
}

/**
 * Map an array of Heya IDs to their Heya objects from WorldState.
 * @param world - The WorldState
 * @param ids - Array of Heya IDs
 * @returns Array of Heya objects
 */
export function mapIdsToHeya(world: WorldState, ids: Id[]): Heya[] {
  return mapIdsToEntities(ids, world.heyas);
}

/**
 * Map an array of Oyakata IDs to their Oyakata objects from WorldState.
 * @param world - The WorldState
 * @param ids - Array of Oyakata IDs
 * @returns Array of Oyakata objects
 */
export function mapIdsToOyakata(world: WorldState, ids: Id[]): Oyakata[] {
  return mapIdsToEntities(ids, world.oyakata);
}

/**
 * Filter entities from a Map based on a predicate.
 * @param entityMap - Map of ID to entity
 * @param predicate - Filter function
 * @returns Array of entities matching the predicate
 */
export function filterEntities<T>(entityMap: Map<Id, T>, predicate: (entity: T) => boolean): T[] {
  const results: T[] = [];
  // ⚡ Bolt Optimization: Use direct for...of loop to prevent O(N) intermediate array allocation
  for (const entity of entityMap.values()) {
    if (predicate(entity)) {
      results.push(entity);
    }
  }
  return results;
}

/**
 * Get all entities from a Map that have IDs in the provided list.
 * @param ids - Array of IDs to look up
 * @param entityMap - Map of ID to entity
 * @returns Array of entities (including undefined for missing IDs)
 */
export function getEntitiesByIds<T>(ids: Id[], entityMap: Map<Id, T>): (T | undefined)[] {
  return ids.map((id) => entityMap.get(id));
}

/**
 * Group entities by a key function.
 * @param entities - Array of entities
 * @param keyFn - Function to extract grouping key
 * @returns Map of key to array of entities
 */
export function groupBy<T, K extends string | number>(
  entities: T[],
  keyFn: (entity: T) => K
): Map<K, T[]> {
  const groups = new Map<K, T[]>();

  for (const entity of entities) {
    const key = keyFn(entity);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    const group = groups.get(key);
    if (group) {
      group.push(entity);
    }
  }

  return groups;
}

/**
 * Count entities by a key function.
 * @param entities - Array of entities
 * @param keyFn - Function to extract counting key
 * @returns Map of key to count
 */
export function countBy<T, K extends string | number>(
  entities: T[],
  keyFn: (entity: T) => K
): Map<K, number> {
  const counts = new Map<K, number>();

  for (const entity of entities) {
    const key = keyFn(entity);
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  return counts;
}
