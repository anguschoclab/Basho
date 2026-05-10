// @ts-nocheck
import type { WorldState } from "../types/world";
import type { Heya } from "../types/heya";
import type { Rikishi } from "../types/rikishi";
import type { Oyakata } from "../types/oyakata";
import type { HeyaTrainingState } from "../types/training";
import type { MyosekiStock, MyosekiTransaction } from "../types/myoseki";
import type { Staff } from "../types/staff";
import type { StateImpact } from "./StateImpact";
import { logEngineEvent } from "../events";
import { getNextTimestamp } from "./StateImpact";

/**
 * Apply a single StateImpact to a WorldState.
 * Returns a new WorldState with the impact applied.
 */
export function applyImpact(world: WorldState, impact: StateImpact): WorldState {
  let result = { ...world };

  // Apply entity updates
  if (impact.entities) {
    if (impact.entities.heyaUpdates) {
      const nextHeyas = new Map(result.heyas);
      for (const [id, update] of impact.entities.heyaUpdates) {
        const existing = nextHeyas.get(id);
        const next = existing ? { ...existing, ...update } : (update as Heya);
        nextHeyas.set(id, next as Heya);
      }
      result = { ...result, heyas: nextHeyas };
    }

    if (impact.entities.rikishiUpdates) {
      const nextRikishi = new Map(result.rikishi);
      for (const [id, update] of impact.entities.rikishiUpdates) {
        const existing = nextRikishi.get(id);
        const next = existing ? { ...existing, ...update } : (update as Rikishi);
        nextRikishi.set(id, next as Rikishi);
      }
      result = { ...result, rikishi: nextRikishi };
    }

    if (impact.entities.oyakataUpdates) {
      const nextOyakata = new Map(result.oyakata);
      for (const [id, update] of impact.entities.oyakataUpdates) {
        const existing = nextOyakata.get(id);
        const next = existing ? { ...existing, ...update } : (update as Oyakata);
        nextOyakata.set(id, next as Oyakata);
      }
      result = { ...result, oyakata: nextOyakata };
    }

    if (impact.entities.sponsorUpdates && result.sponsorPool) {
      const nextSponsors = new Map(result.sponsorPool.sponsors);
      for (const [id, update] of impact.entities.sponsorUpdates) {
        const existing = nextSponsors.get(id);
        nextSponsors.set(id, existing ? { ...existing, ...update } : update);
      }
      result = {
        ...result,
        sponsorPool: {
          ...result.sponsorPool,
          sponsors: nextSponsors,
        },
      };
    }

    if (impact.entities.koenkaiUpdates && result.sponsorPool) {
      const nextKoenkais = new Map(result.sponsorPool.koenkais);
      for (const [id, update] of impact.entities.koenkaiUpdates) {
        const existing = nextKoenkais.get(id);
        nextKoenkais.set(id, existing ? { ...existing, ...update } : update);
      }
      result = {
        ...result,
        sponsorPool: {
          ...result.sponsorPool,
          koenkais: nextKoenkais,
        },
      };
    }
    if (impact.entities.trainingStateUpdates) {
      const nextTraining = new Map(result.trainingState);
      for (const [id, update] of impact.entities.trainingStateUpdates) {
        const existing = nextTraining.get(id);
        const next = existing ? { ...existing, ...update } : (update as HeyaTrainingState);
        nextTraining.set(id, next as HeyaTrainingState);
      }
      result = { ...result, trainingState: nextTraining };
    }

    if (impact.entities.myosekiUpdates && result.myosekiMarket) {
      const nextStocks = { ...result.myosekiMarket.stocks };
      for (const [id, update] of impact.entities.myosekiUpdates) {
        const existing = nextStocks[id];
        nextStocks[id] = existing ? { ...existing, ...update } : (update as MyosekiStock);
      }
      result = {
        ...result,
        myosekiMarket: {
          ...result.myosekiMarket,
          stocks: nextStocks,
        },
      };
    }

    if (impact.entities.staffUpdates && result.staff) {
      const nextStaff = new Map(result.staff);
      for (const [id, update] of impact.entities.staffUpdates) {
        const existing = nextStaff.get(id);
        const next = existing ? { ...existing, ...update } : (update as Staff);
        nextStaff.set(id, next as Staff);
      }
      result = { ...result, staff: nextStaff };
    }
  }

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
  if (impact.arrayAppends && impact.arrayAppends.length > 0) {
    for (const append of impact.arrayAppends) {
      if (append.field === "history") {
        result = { ...result, history: [...(result.history || []), ...append.items] };
      } else if (append.field === "almanacSnapshots") {
        result = {
          ...result,
          almanacSnapshots: [...(result.almanacSnapshots || []), ...append.items],
        };
      } else if (append.field === "basho.matches" && result.currentBasho) {
        result = {
          ...result,
          currentBasho: {
            ...result.currentBasho,
            matches: [...(result.currentBasho.matches || []), ...append.items],
          },
        };
      } else if (append.field === "governanceLog") {
        result = {
          ...result,
          governanceLog: [...(result.governanceLog || []), ...append.items],
        };
      } else if (append.field === "awardLog") {
        result = {
          ...result,
          awardLog: [...(result.awardLog || []), ...append.items],
        };
      } else if (append.field === "myosekiMarket.history" && result.myosekiMarket) {
        result = {
          ...result,
          myosekiMarket: {
            ...result.myosekiMarket,
            history: [...append.items, ...(result.myosekiMarket.history || [])],
          },
        };
      } else if (append.field === "pendingExhibitions") {
        result = {
          ...result,
          pendingExhibitions: [...(result.pendingExhibitions || []), ...append.items],
        };
      }
    }
  }

  // Log events
  if (impact.events && impact.events.length > 0) {
    for (const eventDef of impact.events) {
      logEngineEvent(result, {
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
      return applyImpact(currentWorld, impact);
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
    if (impact.entities) {
      const e = impact.entities;
      const m = merged.entities;
      if (e.heyaUpdates && m?.heyaUpdates) {
        for (const [id, update] of e.heyaUpdates) {
          m.heyaUpdates.set(id, { ...(m.heyaUpdates.get(id) || {}), ...update });
        }
      }
      if (e.rikishiUpdates && m?.rikishiUpdates) {
        for (const [id, update] of e.rikishiUpdates) {
          m.rikishiUpdates.set(id, { ...(m.rikishiUpdates.get(id) || {}), ...update });
        }
      }
      if (e.oyakataUpdates && m?.oyakataUpdates) {
        for (const [id, update] of e.oyakataUpdates) {
          m.oyakataUpdates.set(id, { ...(m.oyakataUpdates.get(id) || {}), ...update });
        }
      }
      if (e.sponsorUpdates && m?.sponsorUpdates) {
        for (const [id, update] of e.sponsorUpdates) {
          m.sponsorUpdates.set(id, { ...(m.sponsorUpdates.get(id) || {}), ...update });
        }
      }
      if (e.koenkaiUpdates && m?.koenkaiUpdates) {
        for (const [id, update] of e.koenkaiUpdates) {
          m.koenkaiUpdates.set(id, { ...(m.koenkaiUpdates.get(id) || {}), ...update });
        }
      }
      if (e.trainingStateUpdates && m?.trainingStateUpdates) {
        for (const [id, update] of e.trainingStateUpdates) {
          m.trainingStateUpdates.set(id, { ...(m.trainingStateUpdates.get(id) || {}), ...update });
        }
      }
      if (e.myosekiUpdates && m?.myosekiUpdates) {
        for (const [id, update] of e.myosekiUpdates) {
          m.myosekiUpdates.set(id, { ...(m.myosekiUpdates.get(id) || {}), ...update });
        }
      }
      if (e.staffUpdates && m?.staffUpdates) {
        for (const [id, update] of e.staffUpdates) {
          m.staffUpdates.set(id, { ...(m.staffUpdates.get(id) || {}), ...update });
        }
      }
    }

    if (impact.collections) {
      const c = impact.collections;
      const m = merged.collections;
      if (c.rikishiToAdd && m?.rikishiToAdd) m.rikishiToAdd.push(...c.rikishiToAdd);
      if (c.rikishiToRemove && m?.rikishiToRemove) m.rikishiToRemove.push(...c.rikishiToRemove);
      if (c.rikishiToHistorical && m?.rikishiToHistorical)
        m.rikishiToHistorical.push(...c.rikishiToHistorical);
      if (c.rikishiFromHistorical && m?.rikishiFromHistorical)
        m.rikishiFromHistorical.push(...c.rikishiFromHistorical);
      if (c.activeRikishiIdsToAdd && m?.activeRikishiIdsToAdd)
        m.activeRikishiIdsToAdd.push(...c.activeRikishiIdsToAdd);
      if (c.activeRikishiIdsToRemove && m?.activeRikishiIdsToRemove)
        m.activeRikishiIdsToRemove.push(...c.activeRikishiIdsToRemove);
      if (c.staffToAdd && m?.staffToAdd) m.staffToAdd.push(...c.staffToAdd);
      if (c.staffToRemove && m?.staffToRemove) m.staffToRemove.push(...c.staffToRemove);
    }

    if (impact.deletedEntities) {
      const d = impact.deletedEntities;
      const m = merged.deletedEntities;
      if (d.heyaIds && m?.heyaIds) m.heyaIds.push(...d.heyaIds);
      if (d.oyakataIds && m?.oyakataIds) m.oyakataIds.push(...d.oyakataIds);
      if (d.rikishiIds && m?.rikishiIds) m.rikishiIds.push(...d.rikishiIds);
    }

    if (impact.worldFields) {
      merged.worldFields = { ...merged.worldFields, ...impact.worldFields };
    }

    if (impact.arrayAppends) {
      for (const append of impact.arrayAppends) {
        const existing = merged.arrayAppends?.find((a) => a.field === append.field);
        if (existing) {
          // Narrow types to satisfy TypeScript that items are compatible
          if (existing.field === "history" && append.field === "history") {
            existing.items.push(...append.items);
          } else if (existing.field === "almanacSnapshots" && append.field === "almanacSnapshots") {
            existing.items.push(...append.items);
          } else if (existing.field === "basho.matches" && append.field === "basho.matches") {
            existing.items.push(...append.items);
          } else if (existing.field === "governanceLog" && append.field === "governanceLog") {
            existing.items.push(...append.items);
          } else if (existing.field === "awardLog" && append.field === "awardLog") {
            existing.items.push(...append.items);
          } else if (
            existing.field === "myosekiMarket.history" &&
            append.field === "myosekiMarket.history"
          ) {
            existing.items.push(...append.items);
          } else if (
            existing.field === "pendingExhibitions" &&
            append.field === "pendingExhibitions"
          ) {
            existing.items.push(...append.items);
          }
        } else {
          if (!merged.arrayAppends) merged.arrayAppends = [];
          // Copy to avoid mutation of source impact
          const newAppend = { ...append, items: [...append.items] } as Exclude<
            StateImpact["arrayAppends"],
            undefined
          >[number];
          merged.arrayAppends.push(newAppend);
        }
      }
    }

    if (impact.events && merged.events) {
      merged.events.push(...impact.events);
    }
  }

  return merged;
}
