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
  { impactField: "sponsorUpdates", worldField: "sponsorPool", nestedField: "sponsors", condition: (w) => !!w.sponsorPool },
  { impactField: "koenkaiUpdates", worldField: "sponsorPool", nestedField: "koenkais", condition: (w) => !!w.sponsorPool },
  { impactField: "myosekiUpdates", worldField: "myosekiMarket", nestedField: "stocks", isRecord: true, condition: (w) => !!w.myosekiMarket },
];

function applyEntityUpdates(
  world: WorldState,
  entities: StateImpact["entities"]
): WorldState {
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
        nextNested[id] = existing ? { ...existing, ...(update as Record<string, unknown>) } : update;
      }
      result = { ...result, [config.worldField]: { ...parent, [config.nestedField]: nextNested } };
    } else if (config.nestedField) {
      const parent = result[config.worldField] as Record<string, unknown> | undefined;
      if (!parent) continue;
      const nextMap = new Map((parent[config.nestedField] as Map<string, unknown>) || new Map());
      for (const [id, update] of updates) {
        const existing = nextMap.get(id);
        nextMap.set(id, existing ? { ...existing, ...(update as Record<string, unknown>) } : update);
      }
      result = { ...result, [config.worldField]: { ...parent, [config.nestedField]: nextMap } };
    } else {
      const nextMap = new Map((result[config.worldField] as Map<string, unknown>) || new Map());
      for (const [id, update] of updates) {
        const existing = nextMap.get(id);
        nextMap.set(id, existing ? { ...existing, ...(update as Record<string, unknown>) } : update);
      }
      result = { ...result, [config.worldField]: nextMap };
    }
  }

  return result;
}

function applyArrayAppends(world: WorldState, appends: StateImpact["arrayAppends"]): WorldState {
  if (!appends || appends.length === 0) return world;
  let result = world;

  for (const append of appends) {
    switch (append.field) {
      case "history":
        result = { ...result, history: [...(result.history || []), ...append.items] };
        break;
      case "almanacSnapshots":
        result = { ...result, almanacSnapshots: [...(result.almanacSnapshots || []), ...append.items] };
        break;
      case "basho.matches":
        if (result.currentBasho) {
          result = {
            ...result,
            currentBasho: {
              ...result.currentBasho,
              matches: [...(result.currentBasho.matches || []), ...append.items],
            },
          };
        }
        break;
      case "governanceLog":
        result = { ...result, governanceLog: [...(result.governanceLog || []), ...append.items] };
        break;
      case "awardLog":
        result = { ...result, awardLog: [...(result.awardLog || []), ...append.items] };
        break;
      case "myosekiMarket.history":
        if (result.myosekiMarket) {
          result = {
            ...result,
            myosekiMarket: {
              ...result.myosekiMarket,
              history: [...append.items, ...(result.myosekiMarket.history || [])],
            },
          };
        }
        break;
      case "pendingExhibitions":
        result = {
          ...result,
          pendingExhibitions: [
            ...(result.pendingExhibitions || []),
            ...(append.items as Array<{ id: string; region: string; prestige: number }>),
          ],
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
  let result = { ...world };

  // Apply entity updates
  result = applyEntityUpdates(result, impact.entities);

  // Apply collection operations
  if (impact.collections) {
    const nextHeyas = new Map(result.heyas);
    let heyasChanged = false;

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
        const heya = nextHeyas.get(rikishi.heyaId) || result.heyas.get(rikishi.heyaId);
        if (heya) {
          const ids = new Set(heya.rikishiIds || []);
          ids.add(rikishi.id);
          nextHeyas.set(rikishi.heyaId, { ...heya, rikishiIds: Array.from(ids) });
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
          const heya = nextHeyas.get(r.heyaId) || result.heyas.get(r.heyaId);
          if (heya) {
            nextHeyas.set(r.heyaId, {
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
          const heya = nextHeyas.get(rikishi.heyaId) || result.heyas.get(rikishi.heyaId);
          if (heya) {
            nextHeyas.set(rikishi.heyaId, {
              ...heya,
              rikishiIds: (heya.rikishiIds || []).filter((rid) => rid !== id),
            });
            heyasChanged = true;
          }
        }
      }
      result = { ...result, rikishi: nextRikishi, historicalRikishi: nextHistorical };
    }

    if (heyasChanged) {
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
 */
export function resolveImpacts(world: WorldState, impacts: StateImpact[]): WorldState {
  if (impacts.length === 0) {
    return world;
  }

  return impacts.reduce((currentWorld, impact) => {
    try {
      const nextWorld = applyImpact(currentWorld, impact);

      // Log events (side effect isolated to coordinator)
      if (impact.events && impact.events.length > 0) {
        for (const eventDef of impact.events) {
          logEngineEvent(nextWorld, {
            type: eventDef.type,
            category: eventDef.category,
            heyaId: eventDef.heyaId,
            rikishiId: eventDef.rikishiId,
            data: eventDef.data,
            importance: eventDef.importance || "notable",
            title: "",
            summary: "",
          });
        }
      }

      return nextWorld;
    } catch (error) {
      console.error(
        `[IMPACT RESOLVER ERROR] in impact from "${impact.metadata?.source || "unknown"}":`,
        error
      );
      return currentWorld;
    }
  }, world);
}

/**
 * Merges multiple StateImpact objects into a single impact.
 */
export function mergeImpacts(impacts: StateImpact[]): StateImpact {
  const merged: StateImpact = {
    entities: {
      heyaUpdates: new Map(),
      rikishiUpdates: new Map(),
      oyakataUpdates: new Map(),
      sponsorUpdates: new Map(),
      koenkaiUpdates: new Map(),
      trainingStateUpdates: new Map(),
      myosekiUpdates: new Map(),
      staffUpdates: new Map(),
    },
    collections: {
      rikishiToAdd: [],
      rikishiToRemove: [],
      rikishiToHistorical: [],
      rikishiFromHistorical: [],
      activeRikishiIdsToAdd: [],
      activeRikishiIdsToRemove: [],
      staffToAdd: [],
      staffToRemove: [],
    },
    deletedEntities: {
      heyaIds: [],
      oyakataIds: [],
      rikishiIds: [],
    },
    worldFields: {},
    arrayAppends: [],
    events: [],
    metadata: {
      source: "merged",
      timestamp: getNextTimestamp(),
    },
  };

  for (const impact of impacts) {
    // Merge entity updates generically
    if (impact.entities && merged.entities) {
      for (const field of ENTITY_UPDATE_CONFIGS.map((c) => c.impactField)) {
        const sourceMap = (impact.entities as Record<string, Map<string, unknown> | undefined>)[field];
        const targetMap = (merged.entities as Record<string, Map<string, unknown> | undefined>)[field];
        if (sourceMap && targetMap) {
          for (const [id, update] of sourceMap) {
            const existing = targetMap.get(id);
            targetMap.set(id, existing ? { ...existing, ...(update as Record<string, unknown>) } : update);
          }
        }
      }
    }

    // Merge collections generically
    if (impact.collections && merged.collections) {
      for (const [key, arr] of Object.entries(impact.collections)) {
        const target = (merged.collections as Record<string, unknown[]>)[key];
        if (target && Array.isArray(arr)) {
          target.push(...arr);
        }
      }
    }

    // Merge deletions generically
    if (impact.deletedEntities && merged.deletedEntities) {
      for (const [key, ids] of Object.entries(impact.deletedEntities)) {
        const target = (merged.deletedEntities as Record<string, string[]>)[key];
        if (target && Array.isArray(ids)) {
          target.push(...ids);
        }
      }
    }

    if (impact.worldFields) {
      merged.worldFields = { ...merged.worldFields, ...impact.worldFields };
    }

    // Merge array appends
    if (impact.arrayAppends) {
      for (const append of impact.arrayAppends) {
        const existing = merged.arrayAppends?.find((a) => a.field === append.field);
        if (existing) {
          (existing.items as unknown[]).push(...append.items);
        } else {
          if (!merged.arrayAppends) merged.arrayAppends = [];
          merged.arrayAppends.push({ ...append, items: [...append.items] } as never);
        }
      }
    }

    if (impact.events && merged.events) {
      merged.events.push(...impact.events);
    }
  }

  return merged;
}
