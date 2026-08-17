/**
 * src/engine/core/EntityService.ts
 * ================================
 * Centralized State Management for Sumo Manager Pro.
 *
 * Provides generic, type-safe helpers for:
 * 1. State Hydration (ensuring a sub-state exists)
 * 2. Generic lookup and factory patterns
 *
 * USE THIS to eliminate redundant "ensureXState" boilerplate in subsystems.
 * Goal: Maximum DRYness and architectural consistency.
 */

import type { WorldState } from "../types/world";

/**
 * Global Entity Service.
 */
export const EntityService = {
  /**
   * Type-safe generic state hydrator.
   * Ensures a state property exists on the parent object, creating it with the factory if missing.
   *
   * @param {any} parent - The object containing the state (e.g., WorldState or Heya).
   * @param {string} key - The property key for the state.
   * @param {() => T} factory - A function returning the default state if it doesn't exist.
   * @returns {T} The existing or newly created state.
   *
   * @example
   * ```ts
   * const trainingState = EntityService.ensureState(world, "trainingState", () => ({
   *   heyaId: world.playerHeyaId,
   *   activeProfile: { intensity: "balanced" },
   *   focusSlots: [],
   * }));
   * ```
   */
  ensureState<Parent extends object, Key extends keyof Parent>(
    parent: Parent,
    key: Key,
    factory: () => NonNullable<Parent[Key]>
  ): NonNullable<Parent[Key]> {
    if (!parent[key]) {
      Object.assign(parent, { [key]: factory() });
    }
    return parent[key] as NonNullable<Parent[Key]>;
  },

  /**
   * Hydrate a state in a nested record.
   * Useful for per-heya states (world.trainingState[heyaId]).
   *
   * CONTRACT / WARNING: This does NOT automatically detect Map vs POJO types.
   * It uses a hardcoded allowlist to initialize as a Map.
   * If a new Map field (like 'sparringPairs') is added to WorldState but not the allowlist here,
   * it will be silently initialized as a POJO ({}), causing runtime type errors when .set() or .get() is called.
   *
   * To safely add a new IdMapRuntime field, you MUST update the allowlist array inside 'ensureNestedState' below.
   *
   * @param {WorldState} world - The WorldState.
   * @param {keyof WorldState} rootKey - The top-level key (e.g., 'trainingState').
   * @param {string} id - The nested key (e.g., heyaId).
   * @param {() => T} factory - The default state factory.
   * @returns {T} The existing or newly created nested state.
   *
   * @example
   * ```ts
   * const heyaTrainingState = EntityService.ensureNestedState(
   *   world,
   *   "trainingState",
   *   heyaId,
   *   () => createDefaultTrainingState(heyaId)
   * );
   * ```
   */
  ensureNestedState<T>(
    world: WorldState,
    rootKey: keyof WorldState,
    id: string,
    factory: () => T
  ): T {
    // Use the hardcoded allowlist to determine if the root should be a Map or a POJO
    if (!world[rootKey]) {
      const isMapField = [
        "rikishi",
        "heyas",
        "oyakata",
        "staff",
        "trainingState",
        "closedHeyas",
        "sparringPairs",
      ].includes(rootKey as string);

      Object.assign(world, { [rootKey]: isMapField ? new Map<string, T>() : {} });
    }

    const root = world[rootKey];

    if (root instanceof Map) {
      if (!root.has(id)) {
        // We know it is a Map<string, T> since we either just created it as one, or it's statically typed as Map.
        // We can safely cast it to Map<string, T> rather than root being Map<unknown, unknown>
        (root as Map<string, T>).set(id, factory());
      }
      return (root as Map<string, T>).get(id) as T;
    } else {
      const record = root as Record<string, T>;
      if (!record[id]) {
        record[id] = factory();
      }
      return record[id];
    }
  },
};
