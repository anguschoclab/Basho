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
   * 
   * @param parent - The object containing the state (e.g., WorldState or Heya).
   * @param key - The property key for the state.
   * @param factory - A function returning the default state if it doesn't exist.
   */
  ensureState<T>(parent: any, key: string, factory: () => T): T {
    if (!parent[key]) {
      parent[key] = factory();
    }
    return parent[key];
  },

  /**
   * Hydrate a state in a nested record.
   * Useful for per-heya states (world.trainingState[heyaId]).
   * 
   * @param world - The WorldState.
   * @param rootKey - The top-level key (e.g., 'trainingState').
   * @param id - The nested key (e.g., heyaId).
   * @param factory - The default state factory.
   */
  ensureNestedState<T>(
    world: WorldState, 
    rootKey: keyof WorldState, 
    id: string, 
    factory: () => T
  ): T {
    // Determine if the root should be a Map or a POJO
    // In Sumo Manager Pro, most IdMapRuntime fields are Maps
    if (!world[rootKey]) {
      const isMapField = ["rikishi", "heyas", "oyakata", "staff", "trainingState", "closedHeyas"].includes(rootKey as string);
      (world as any)[rootKey] = isMapField ? new Map() : {};
    }

    const root = world[rootKey] as any;
    
    if (root instanceof Map) {
      if (!root.has(id)) {
        root.set(id, factory());
      }
      return root.get(id);
    } else {
      if (!root[id]) {
        root[id] = factory();
      }
      return root[id];
    }
  }
};
