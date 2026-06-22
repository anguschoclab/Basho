import type { WorldState } from "../types/world";
import type { StateImpact } from "./StateImpact";
import { logEngineEvent } from "../events";
import { getNextTimestamp } from "./StateImpact";

/**
 * Registry of entity update configurations for generic application.
 */
interface EntityUpdateConfig {
  impactField: string;
  worldField: keyof WorldState;
  nestedField?: string;
  isRecord?: boolean;
  condition?: (world: WorldState) => boolean;
}

const ENTITY_UPDATE_CONFIGS: EntityUpdateConfig[] = [
  { impactField: "heyaUpdates", worldField: "heyas" },
  { impactField: "rikishiUpdates", worldField: "rikishi" },
  { impactField: "oyakataUpdates", worldField: "oyakata" },
  { impactField: "trainingStateUpdates", worldField: "trainingState" },
  { impactField: "staffUpdates", worldField: "staff", condition: (w) => !!w.staff },
  {
    impactField: "sponsorUpdates",
    worldField: "sponsorPool",
    nestedField: "sponsors",
    condition: (w) => !!w.sponsorPool,
  },
  {
    impactField: "koenkaiUpdates",
    worldField: "sponsorPool",
    nestedField: "koenkais",
    condition: (w) => !!w.sponsorPool,
  },
  {
    impactField: "myosekiUpdates",
    worldField: "myosekiMarket",
    nestedField: "stocks",
    isRecord: true,
    condition: (w) => !!w.myosekiMarket,
  },
];

function applyEntityUpdates(world: WorldState, entities: StateImpact["entities"]): WorldState {
  if (!entities) return world;
  let result = world;
  const entityMap = entities as Record<string, Map<string, unknown> | undefined>;

  for (const config of ENTITY_UPDATE_CONFIGS) {
    const updates = entityMap[config.impactField];
    if (!updates || updates.size === 0) continue;
    if (config.condition && !config.condition(result)) continue;

    if (config.isRecord) {
      const parent = result[config.worldField] as Record<string, unknown> | undefined;
      if (!parent || !config.nestedField) continue;
      const nextNested = { ...(parent[config.nestedField] as Record<string, unknown>) };
      for (const [id, update] of updates) {
        const existing = nextNested[id];
        nextNested[id] = existing
          ? { ...existing, ...(update as Record<string, unknown>) }
          : update;
      }
      result = { ...result, [config.worldField]: { ...parent, [config.nestedField]: nextNested } };
    } else if (config.nestedField) {
      const parent = result[config.worldField] as Record<string, unknown> | undefined;
      if (!parent) continue;
      const nextMap = new Map((parent[config.nestedField] as Map<string, unknown>) || new Map());
      for (const [id, update] of updates) {
        const existing = nextMap.get(id);
        nextMap.set(
          id,
          existing ? { ...existing, ...(update as Record<string, unknown>) } : update
        );
      }
      result = { ...result, [config.worldField]: { ...parent, [config.nestedField]: nextMap } };
    } else {
      const nextMap = new Map((result[config.worldField] as Map<string, unknown>) || new Map());
      for (const [id, update] of updates) {
        const existing = nextMap.get(id);
        nextMap.set(
          id,
          existing ? { ...existing, ...(update as Record<string, unknown>) } : update
        );
      }
      result = { ...result, [config.worldField]: nextMap };
    }
  }

  return result;
}

function applyArrayAppends(world: WorldState, appends: StateImpact["arrayAppends"]): WorldState {
  if (!appends || appends.length === 0) return world;

  // Batch items by field to avoid intermediate array allocations
  const fieldItems = new Map<string, unknown[]>();
  for (const append of appends) {
    const existing = fieldItems.get(append.field);
    if (existing) {
      existing.push(...append.items);
    } else {
      fieldItems.set(append.field, [...append.items]);
    }
  }

  let result = world;
  for (const [field, items] of fieldItems) {
    switch (field) {
      case "history":
        result = { ...result, history: [...(result.history || []), ...(items as never[])] };
        break;
      case "almanacSnapshots":
        result = {
          ...result,
          almanacSnapshots: [...(result.almanacSnapshots || []), ...(items as never[])],
        };
        break;
      case "basho.matches":
        if (result.currentBasho) {
          result = {
            ...result,
            currentBasho: {
              ...result.currentBasho,
              matches: [...(result.currentBasho.matches || []), ...(items as never[])],
            },
          };
        }
        break;
      case "governanceLog":
        result = {
          ...result,
          governanceLog: [...(result.governanceLog || []), ...(items as never[])],
        };
        break;
      case "awardLog":
        result = { ...result, awardLog: [...(result.awardLog || []), ...(items as never[])] };
        break;
      case "myosekiMarket.history":
        if (result.myosekiMarket) {
          result = {
            ...result,
            myosekiMarket: {
              ...result.myosekiMarket,
              history: [...(items as never[]), ...(result.myosekiMarket.history || [])],
            },
          };
        }
        break;
      case "pendingExhibitions":
        result = {
          ...result,
          pendingExhibitions: [...(result.pendingExhibitions || []), ...(items as never[])],
        };
        break;
    }
  }

  return result;
}

/**
 * Apply a single StateImpact to a WorldState.
 * Returns a new WorldState with the impact applied.
 * Pure: no side effects.
 */
export function applyImpact(world: WorldState, impact: StateImpact): WorldState {
  return _applyImpact({ ...world }, impact);
}

/**
 * Internal: apply impact to an existing mutable accumulator.
 * Used by resolveImpacts to avoid redundant WorldState copies.
 */
function _applyImpact(result: WorldState, impact: StateImpact): WorldState {
  // Apply entity updates
  result = applyEntityUpdates(result, impact.entities);

  // Apply collection operations
  if (impact.collections) {
    let nextHeyas: Map<string, import("../types/heya").Heya> | undefined;
    let heyasChanged = false;

    const ensureHeyas = (): Map<string, import("../types/heya").Heya> => {
      if (!nextHeyas) nextHeyas = new Map(result.heyas);
      return nextHeyas;
    };

    // Handle activeRikishiIds operations
    if (impact.collections.activeRikishiIdsToAdd || impact.collections.activeRikishiIdsToRemove) {
      const nextActiveIds = new Set(result.activeRikishiIds);
      if (impact.collections.activeRikishiIdsToAdd) {
        for (const id of impact.collections.activeRikishiIdsToAdd) {
          nextActiveIds.add(id);
        }
      }
      if (impact.collections.activeRikishiIdsToRemove) {
        for (const id of impact.collections.activeRikishiIdsToRemove) {
          nextActiveIds.delete(id);
        }
      }
      result = { ...result, activeRikishiIds: nextActiveIds };
    }

    if (impact.collections.rikishiToAdd) {
      const nextRikishi = new Map(result.rikishi);
      for (const rikishi of impact.collections.rikishiToAdd) {
        nextRikishi.set(rikishi.id, rikishi);

        // Sync Heya Roster
        const heya = nextHeyas?.get(rikishi.heyaId) || result.heyas.get(rikishi.heyaId);
        if (heya) {
          const ids = new Set(heya.rikishiIds || []);
          ids.add(rikishi.id);
          ensureHeyas().set(rikishi.heyaId, { ...heya, rikishiIds: Array.from(ids) });
          heyasChanged = true;
        }
      }
      result = { ...result, rikishi: nextRikishi };
    }

    if (impact.collections.rikishiToRemove) {
      const nextRikishi = new Map(result.rikishi);
      for (const id of impact.collections.rikishiToRemove) {
        const r = nextRikishi.get(id);
        if (r) {
          // Sync Heya Roster
          const heya = nextHeyas?.get(r.heyaId) || result.heyas.get(r.heyaId);
          if (heya) {
            ensureHeyas().set(r.heyaId, {
              ...heya,
              rikishiIds: (heya.rikishiIds || []).filter((rid) => rid !== id),
            });
            heyasChanged = true;
          }
        }
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

          // Sync Heya Roster (Remove from active roster)
          const heya = nextHeyas?.get(rikishi.heyaId) || result.heyas.get(rikishi.heyaId);
          if (heya) {
            ensureHeyas().set(rikishi.heyaId, {
              ...heya,
              rikishiIds: (heya.rikishiIds || []).filter((rid) => rid !== id),
            });
            heyasChanged = true;
          }
        }
      }
      result = { ...result, rikishi: nextRikishi, historicalRikishi: nextHistorical };
    }

    if (impact.collections.heyaToAdd) {
      const nextHeyas = ensureHeyas();
      for (const h of impact.collections.heyaToAdd) {
        nextHeyas.set(h.id, h);
      }
      heyasChanged = true;
    }

    if (heyasChanged && nextHeyas) {
      result = { ...result, heyas: nextHeyas };
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

    if (impact.collections.staffToAdd) {
      const nextStaff = new Map(result.staff);
      for (const s of impact.collections.staffToAdd) {
        nextStaff.set(s.id, s);
      }
      result = { ...result, staff: nextStaff };
    }

    if (impact.collections.staffToRemove) {
      const nextStaff = new Map(result.staff);
      for (const id of impact.collections.staffToRemove) {
        nextStaff.delete(id);
      }
      result = { ...result, staff: nextStaff };
    }

    if (impact.collections.oyakataToAdd) {
      const nextOyakata = new Map(result.oyakata);
      for (const o of impact.collections.oyakataToAdd) {
        nextOyakata.set(o.id, o);
      }
      result = { ...result, oyakata: nextOyakata };
    }

    if (impact.collections.oyakataToRemove) {
      const nextOyakata = new Map(result.oyakata);
      for (const id of impact.collections.oyakataToRemove) {
        nextOyakata.delete(id);
      }
      result = { ...result, oyakata: nextOyakata };
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
    result = {
      ...result,
      ...impact.worldFields,
    };
  }

  // Apply array appends
  result = applyArrayAppends(result, impact.arrayAppends);

  return result;
}

/**
 * Resolves an array of StateImpact objects against a base WorldState.
 * Uses a single mutable accumulator to avoid redundant WorldState copies.
 */
export function resolveImpacts(world: WorldState, impacts: StateImpact[]): WorldState {
  if (impacts.length === 0) {
    return world;
  }

  let result = { ...world };

  for (const impact of impacts) {
    try {
      result = _applyImpact(result, impact);

      // Log events (side effect isolated to coordinator)
      if (impact.events && impact.events.length > 0) {
        for (const eventDef of impact.events) {
          logEngineEvent(result, {
            type: eventDef.type,
            category: eventDef.category,
            heyaId: eventDef.heyaId,
            rikishiId: eventDef.rikishiId,
            data: eventDef.data,
            importance: eventDef.importance || "notable",
            title: (eventDef.data as { title?: string }).title ?? "",
            summary: (eventDef.data as { summary?: string }).summary ?? "",
          });
        }
      }
    } catch (error) {
      console.error(
        `[IMPACT RESOLVER ERROR] in impact from "${impact.metadata?.source || "unknown"}":`,
        error
      );
    }
  }

  return result;
}

/**
 * Merges multiple StateImpact objects into a single impact.
 * Uses lazy sub-map creation and Map-based array append merging.
 */
export function mergeImpacts(impacts: StateImpact[]): StateImpact {
  const merged: StateImpact = {
    metadata: {
      source: "merged",
      timestamp: getNextTimestamp(),
    },
  };

  // Accumulate array appends by field to avoid O(n²) .find()
  const appendMap = new Map<string, unknown[]>();

  for (const impact of impacts) {
    // Merge entity updates with lazy sub-map creation
    if (impact.entities) {
      if (!merged.entities) merged.entities = {};
      for (const field of ENTITY_UPDATE_CONFIGS.map((c) => c.impactField)) {
        const sourceMap = (impact.entities as Record<string, Map<string, unknown> | undefined>)[
          field
        ];
        if (!sourceMap || sourceMap.size === 0) continue;
        let targetMap = (merged.entities as Record<string, Map<string, unknown> | undefined>)[
          field
        ];
        if (!targetMap) {
          targetMap = new Map();
          (merged.entities as Record<string, Map<string, unknown>>)[field] = targetMap;
        }
        for (const [id, update] of sourceMap) {
          const existing = targetMap.get(id);
          targetMap.set(
            id,
            existing ? { ...existing, ...(update as Record<string, unknown>) } : update
          );
        }
      }
    }

    // Merge collections with lazy array creation
    if (impact.collections) {
      if (!merged.collections) merged.collections = {};
      for (const key in impact.collections) {
        if (!Object.prototype.hasOwnProperty.call(impact.collections, key)) continue;
        const arr = (impact.collections as Record<string, unknown[]>)[key];
        if (!Array.isArray(arr) || arr.length === 0) continue;
        let target = (merged.collections as Record<string, unknown[]>)[key];
        if (!target) {
          target = [];
          (merged.collections as Record<string, unknown[]>)[key] = target;
        }
        target.push(...arr);
      }
    }

    // Merge deletions with lazy array creation
    if (impact.deletedEntities) {
      if (!merged.deletedEntities) merged.deletedEntities = {};
      for (const key in impact.deletedEntities) {
        if (!Object.prototype.hasOwnProperty.call(impact.deletedEntities, key)) continue;
        const ids = (impact.deletedEntities as Record<string, string[]>)[key];
        if (!Array.isArray(ids) || ids.length === 0) continue;
        let target = (merged.deletedEntities as Record<string, string[]>)[key];
        if (!target) {
          target = [];
          (merged.deletedEntities as Record<string, string[]>)[key] = target;
        }
        target.push(...ids);
      }
    }

    if (impact.worldFields) {
      merged.worldFields = { ...(merged.worldFields || {}), ...impact.worldFields };
    }

    // Accumulate array appends by field
    if (impact.arrayAppends) {
      for (const append of impact.arrayAppends) {
        const existing = appendMap.get(append.field);
        if (existing) {
          existing.push(...append.items);
        } else {
          appendMap.set(append.field, [...append.items]);
        }
      }
    }

    // Merge events
    if (impact.events && impact.events.length > 0) {
      if (!merged.events) merged.events = [];
      merged.events.push(...impact.events);
    }
  }

  // Convert accumulated array appends back to array format
  if (appendMap.size > 0) {
    merged.arrayAppends = Array.from(appendMap.entries()).map(
      ([field, items]) => ({ field, items }) as never
    );
  }

  return merged;
}
