/**
 * Impact Resolver
 * 
 * Applies StateImpact objects to a WorldState to produce a new state.
 * All impacts are applied atomically - either all succeed or none are applied.
 */

import type { WorldState } from "../types/world";
import type { Heya } from "../types/heya";
import type { Rikishi } from "../types/rikishi";
import type { Oyakata } from "../types/oyakata";
import type { StateImpact } from "./StateImpact";
import { logEngineEvent } from "../events";

/**
 * Apply a single StateImpact to a WorldState.
 * Applies a single StateImpact to a WorldState.
 * Returns a new WorldState with the impact applied.
 */
function applyImpact(world: WorldState, impact: StateImpact): WorldState {
  let result = { ...world };

  // Apply entity updates
  if (impact.entities) {
    if (impact.entities.heyaUpdates) {
      const nextHeyas = new Map(result.heyas);
      for (const [id, update] of impact.entities.heyaUpdates) {
        const existing = nextHeyas.get(id);
        nextHeyas.set(id, existing ? { ...existing, ...update } as Heya : update as Heya);
      }
      result = { ...result, heyas: nextHeyas };
    }

    if (impact.entities.rikishiUpdates) {
      const nextRikishi = new Map(result.rikishi);
      for (const [id, update] of impact.entities.rikishiUpdates) {
        const existing = nextRikishi.get(id);
        nextRikishi.set(id, existing ? { ...existing, ...update } as Rikishi : update as Rikishi);
      }
      result = { ...result, rikishi: nextRikishi };
    }

    if (impact.entities.oyakataUpdates) {
      const nextOyakata = new Map(result.oyakata);
      for (const [id, update] of impact.entities.oyakataUpdates) {
        const existing = nextOyakata.get(id);
        nextOyakata.set(id, existing ? { ...existing, ...update } as Oyakata : update as Oyakata);
      }
      result = { ...result, oyakata: nextOyakata };
    }
  }

  // Apply collection operations
  if (impact.collections) {
    if (impact.collections.rikishiToAdd) {
      const nextRikishi = new Map(result.rikishi);
      for (const rikishi of impact.collections.rikishiToAdd) {
        nextRikishi.set(rikishi.id, rikishi);
      }
      result = { ...result, rikishi: nextRikishi };
    }

    if (impact.collections.rikishiToRemove) {
      const nextRikishi = new Map(result.rikishi);
      for (const id of impact.collections.rikishiToRemove) {
        nextRikishi.delete(id);
      }
      result = { ...result, rikishi: nextRikishi };
    }

    if (impact.collections.rikishiToHistorical) {
      const nextRikishi = new Map(result.rikishi);
      const nextHistorical = new Map(result.historicalRikishi);
      for (const id of impact.collections.rikishiToHistorical) {
        const rikishi = nextRikishi.get(id);
        if (rikishi) {
          nextRikishi.delete(id);
          nextHistorical.set(id, rikishi);
        }
      }
      result = { ...result, rikishi: nextRikishi, historicalRikishi: nextHistorical };
    }

    if (impact.collections.rikishiFromHistorical) {
      const nextRikishi = new Map(result.rikishi);
      const nextHistorical = new Map(result.historicalRikishi);
      for (const id of impact.collections.rikishiFromHistorical) {
        const rikishi = nextHistorical.get(id);
        if (rikishi) {
          nextHistorical.delete(id);
          nextRikishi.set(id, rikishi);
        }
      }
      result = { ...result, rikishi: nextRikishi, historicalRikishi: nextHistorical };
    }
  }

  // Apply entity deletions
  if (impact.deletedEntities) {
    if (impact.deletedEntities.heyaIds && impact.deletedEntities.heyaIds.length > 0) {
      const nextHeyas = new Map(result.heyas);
      for (const id of impact.deletedEntities.heyaIds) {
        nextHeyas.delete(id);
      }
      result = { ...result, heyas: nextHeyas };
    }

    if (impact.deletedEntities.oyakataIds && impact.deletedEntities.oyakataIds.length > 0) {
      const nextOyakata = new Map(result.oyakata);
      for (const id of impact.deletedEntities.oyakataIds) {
        nextOyakata.delete(id);
      }
      result = { ...result, oyakata: nextOyakata };
    }

    if (impact.deletedEntities.rikishiIds && impact.deletedEntities.rikishiIds.length > 0) {
      const nextRikishi = new Map(result.rikishi);
      for (const id of impact.deletedEntities.rikishiIds) {
        nextRikishi.delete(id);
      }
      result = { ...result, rikishi: nextRikishi };
    }
  }

  // Apply world field updates
  if (impact.worldFields) {
    result = { ...result, ...impact.worldFields };
  }

  // Log events
  if (impact.events && impact.events.length > 0) {
    for (const eventDef of impact.events) {
      // Construct full EngineEvent and log via logEngineEvent
      // The logEngineEvent function will handle deduplication and append to world.events.log
      logEngineEvent(result, {
        type: eventDef.type,
        category: eventDef.category,
        heyaId: eventDef.heyaId,
        rikishiId: eventDef.rikishiId,
        data: eventDef.data,
        importance: eventDef.importance || 'notable',
        title: '', // Will be filled by event factory if needed
        summary: '', // Will be filled by event factory if needed
      });
    }
  }

  return result;
}

/**
 * Resolves an array of StateImpact objects against a base WorldState.
 * Impacts are applied in order, with each impact building on the result of the previous.
 * Returns the final resolved WorldState.
 * 
 * @param world - The base WorldState to apply impacts to
 * @param impacts - Array of StateImpact objects to apply
 * @returns The resolved WorldState with all impacts applied
 */
export function resolveImpacts(world: WorldState, impacts: StateImpact[]): WorldState {
  if (impacts.length === 0) {
    return world;
  }

  return impacts.reduce((currentWorld, impact) => {
    try {
      return applyImpact(currentWorld, impact);
    } catch (error) {
      console.error(`[IMPACT RESOLVER ERROR] in impact from "${impact.metadata?.source || 'unknown'}":`, error);
      // Return the world state before this impact failed
      return currentWorld;
    }
  }, world);
}

/**
 * Merges multiple StateImpact objects into a single impact.
 * Useful for combining impacts from different sources before resolution.
 * 
 * @param impacts - Array of StateImpact objects to merge
 * @returns A single merged StateImpact
 */
export function mergeImpacts(impacts: StateImpact[]): StateImpact {
  const merged: StateImpact = {
    entities: {
      heyaUpdates: new Map(),
      rikishiUpdates: new Map(),
      oyakataUpdates: new Map(),
    },
    collections: {
      rikishiToAdd: [],
      rikishiToRemove: [],
      rikishiToHistorical: [],
      rikishiFromHistorical: [],
    },
    deletedEntities: {
      heyaIds: [],
      oyakataIds: [],
      rikishiIds: [],
    },
    worldFields: {},
    events: [],
    metadata: {
      source: 'merged',
      timestamp: Date.now(),
    },
  };

  for (const impact of impacts) {
    // Merge entity updates
    if (impact.entities?.heyaUpdates) {
      for (const [id, update] of impact.entities.heyaUpdates) {
        const existing = merged.entities!.heyaUpdates!.get(id);
        merged.entities!.heyaUpdates!.set(id, existing ? { ...existing, ...update } : update);
      }
    }
    if (impact.entities?.rikishiUpdates) {
      for (const [id, update] of impact.entities.rikishiUpdates) {
        const existing = merged.entities!.rikishiUpdates!.get(id);
        merged.entities!.rikishiUpdates!.set(id, existing ? { ...existing, ...update } : update);
      }
    }
    if (impact.entities?.oyakataUpdates) {
      for (const [id, update] of impact.entities.oyakataUpdates) {
        const existing = merged.entities!.oyakataUpdates!.get(id);
        merged.entities!.oyakataUpdates!.set(id, existing ? { ...existing, ...update } : update);
      }
    }

    // Merge collection operations
    if (impact.collections?.rikishiToAdd) {
      merged.collections!.rikishiToAdd!.push(...impact.collections.rikishiToAdd);
    }
    if (impact.collections?.rikishiToRemove) {
      merged.collections!.rikishiToRemove!.push(...impact.collections.rikishiToRemove);
    }
    if (impact.collections?.rikishiToHistorical) {
      merged.collections!.rikishiToHistorical!.push(...impact.collections.rikishiToHistorical);
    }
    if (impact.collections?.rikishiFromHistorical) {
      merged.collections!.rikishiFromHistorical!.push(...impact.collections.rikishiFromHistorical);
    }

    // Merge deleted entities
    if (impact.deletedEntities?.heyaIds) {
      merged.deletedEntities!.heyaIds!.push(...impact.deletedEntities.heyaIds);
    }
    if (impact.deletedEntities?.oyakataIds) {
      merged.deletedEntities!.oyakataIds!.push(...impact.deletedEntities.oyakataIds);
    }
    if (impact.deletedEntities?.rikishiIds) {
      merged.deletedEntities!.rikishiIds!.push(...impact.deletedEntities.rikishiIds);
    }

    // Merge world field updates (last writer wins)
    if (impact.worldFields) {
      if (!merged.worldFields) {
        merged.worldFields = {};
      }
      Object.assign(merged.worldFields, impact.worldFields);
    }

    // Merge events
    if (impact.events) {
      merged.events!.push(...impact.events);
    }
  }

  return merged;
}
