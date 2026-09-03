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
   * Generic state hydrator.
   * Ensures a state property exists on the parent object, creating it with the factory if missing.
   *
   * CONTRACT / WARNING: This function MUTATES the `parent` object in-place.
   * It bypasses TypeScript assignment checks via generic casts. Do not assume deep
   * structural type safety when using this to attach missing nested state.
   *
   * @param {Parent} parent - The object containing the state (e.g., WorldState or Heya).
   * @param {Key} key - The property key for the state.
   * @param {() => NonNullable<Parent[Key]>} factory - A function returning the default state if it doesn't exist.
   * @returns {NonNullable<Parent[Key]>} The existing or newly created state.
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
   * CONTRACT / WARNING: This function MUTATES the `world` object in-place if `rootKey`
   * or `id` is missing. The returned object is a reference to the nested state, so
   * modifications to it will mutate the parent world.
   *
   * ⚠️ CONTRACT / WARNING - SILENT POJO CORRUPTION:
   * This function does NOT automatically detect `Map` vs POJO types from generic arguments.
   * It relies entirely on a hardcoded allowlist (`isMapField`) inside this function body.
   *
   * 🛑 If you add a new `IdMapRuntime<T>` (or `Map`) field to `WorldState`, you MUST
   * manually add its string key (e.g. 'factions', 'bloodlines') to the `isMapField` array below.
   *
   * Failing to do so causes the state to silently initialize as a POJO `{}` instead of a `Map`.
   * The TypeScript compiler will NOT catch this, and the game will crash at runtime
   * with `TypeError: world.[yourField].get is not a function` the first time you try to read it.
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
        "historicalRikishi",
        "heyas",
        "oyakata",
        "staff",
        "trainingState",
        "closedHeyas",
        "sparringPairs",
      ].includes(rootKey as string);
      Object.assign(world, { [rootKey]: isMapField ? new Map() : {} });
    }

    const root = world[rootKey];

    if (root instanceof Map) {
      const mapRoot = root as Map<string, T>;
      if (!mapRoot.has(id)) {
        mapRoot.set(id, factory());
      }
      return mapRoot.get(id) as T;
    } else {
      const record = root as Record<string, T>;
      if (!record[id]) {
        record[id] = factory();
      }
      return record[id];
    }
  },
};
