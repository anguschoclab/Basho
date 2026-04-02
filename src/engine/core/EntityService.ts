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
    if (!world[rootKey]) {
      (world as any)[rootKey] = {};
    }
    const root = world[rootKey] as Record<string, T>;
    if (!root[id]) {
      root[id] = factory();
    }
    return root[id];
  }
};
