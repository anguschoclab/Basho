/**
 * src/engine/core/EntityCollection.ts
 * ===================================
 * Unified entity provider for Sumo Manager Pro.
 * 
 * Provides centralized, pre-filtered, and sorted access to WorldState entities.
 * USE THIS instead of manual iteration (e.g., Array.from(world.rikishi.values())) 
 * to eliminate systemic code duplication and O(N log N) overhead from redundant sorts.
 */

import type { WorldState } from "../types/world";
import type { Rikishi } from "../types/rikishi";
import type { Heya } from "../types/heya";
import { stableSort } from "../utils/sort";

/**
 * Options for entity retrieval.
 */
export interface EntityQueryOptions {
  /** If true, includes retired rikishi. Defaults to false. */
  includeRetired?: boolean;
  /** If provided, filters by heyaId. */
  heyaId?: string;
  /** If true, returns a Map instead of an Array for O(1) specific lookup. */
  asMap?: boolean;
}

/**
 * Unified collection service.
 */
export const EntityCollection = {
  /**
   * Get all rikishi, sorted by ID for determinism.
   * Auto-filters retired by default.
   */
  getRikishi(world: WorldState, options: EntityQueryOptions = {}): Rikishi[] {
    const all = Array.from(world.rikishi.values());
    const filtered = all.filter(r => {
      const retiredMatch = options.includeRetired ? true : !r.isRetired;
      const heyaMatch = options.heyaId ? r.heyaId === options.heyaId : true;
      return retiredMatch && heyaMatch;
    });

    return stableSort(filtered, r => r.id);
  },

  /**
   * Get all active (non-retired) rikishi.
   */
  getActiveRikishi(world: WorldState): Rikishi[] {
    return this.getRikishi(world, { includeRetired: false });
  },

  /**
   * Get all rikishi for a specific heya.
   */
  getHeyaRoster(world: WorldState, heyaId: string): Rikishi[] {
    return this.getRikishi(world, { heyaId, includeRetired: false });
  },

  /**
   * Get all heyas, sorted by ID for determinism.
   */
  getHeyas(world: WorldState): Heya[] {
    const all = Array.from(world.heyas.values());
    return stableSort(all, h => h.id);
  },

  /**
   * Get a specific heya by ID.
   */
  getHeya(world: WorldState, heyaId: string): Heya | undefined {
    return world.heyas.get(heyaId);
  },

  /**
   * Get a specific rikishi by ID.
   */
  getRikishiById(world: WorldState, id: string): Rikishi | undefined {
    return world.rikishi.get(id);
  }
};
