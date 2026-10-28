import type { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";
import type { Heya } from "@/engine/types/heya";
import type { Id } from "@/engine/types/common";
import type { EngineEvent } from "@/engine/types/events";
import { queryEvents } from "@/engine/events/events";

/** Cache to avoid recalculating heavy queries during the same tick */
interface SelectorCache {
  dayIndexGlobal: number;
  activeRikishi?: Rikishi[];
  availableStables?: Heya[];
}

// Attach a non-enumerable property to WorldState at runtime, or use a WeakMap.
// WeakMap automatically garbage collects entries when WorldState objects are no longer referenced,
// so no manual reset is needed for test isolation.
const cacheMap = new WeakMap<WorldState, SelectorCache>();

function getCache(world: WorldState): SelectorCache {
  let cache = cacheMap.get(world);
  if (!cache || cache.dayIndexGlobal !== world.dayIndexGlobal) {
    cache = { dayIndexGlobal: world.dayIndexGlobal ?? 0 };
    cacheMap.set(world, cache);
  }
  return cache;
}

/**
 * Returns all active (non-retired) rikishi.
 * Uses a single for-of loop and memoizes the result per tick.
 */
export function getActiveRikishi(world: WorldState): Rikishi[] {
  const cache = getCache(world);
  if (cache.activeRikishi) return cache.activeRikishi;

  const result: Rikishi[] = [];
  if (world.activeRikishiIds) {
    for (const id of world.activeRikishiIds) {
      const r = world.rikishi.get(id);
      if (r) {
        result.push(r);
      }
    }
  }

  cache.activeRikishi = result;
  return result;
}

/**
 * Returns all eligible opponents for a given rikishi.
 * Opponents must be active, not injured, and not from the same stable.
 * (This is primarily an example for matchmaking/NPC queries)
 */
export function getEligibleOpponents(world: WorldState, rikishiId: Id): Rikishi[] {
  const me = world.rikishi.get(rikishiId);
  if (!me) return [];

  const active = getActiveRikishi(world);
  const eligible: Rikishi[] = [];
  for (const r of active) {
    if (r.id !== rikishiId && !r.injured && r.heyaId !== me.heyaId) {
      eligible.push(r);
    }
  }
  return eligible;
}

/**
 * Returns all active stables (Heya).
 * Memoized per tick.
 */
export function getAvailableStables(world: WorldState): Heya[] {
  const cache = getCache(world);
  if (cache.availableStables) return cache.availableStables;

  const result: Heya[] = [];
  for (const h of world.heyas.values()) {
    result.push(h);
  }
  cache.availableStables = result;
  return result;
}

/**
 * Convenience selector to get stable finances.
 */
export function getStableFinances(world: WorldState, heyaId: Id): number {
  const h = world.heyas.get(heyaId);
  return h?.funds ?? 0;
}

/**
 * Reference-equality memoizer shared by the selectors below. Moved here from
 * presenters/selectors.ts during the boundary fix so the engine worker digest
 * path can use the same cached selectors without importing UI code.
 */
export function createSelector<T>(fn: (world: WorldState) => T) {
  let lastWorld: WorldState | null = null;
  let lastResult: T;

  return (world: WorldState): T => {
    if (world === lastWorld && lastWorld !== null) {
      return lastResult;
    }
    lastWorld = world;
    lastResult = fn(world);
    return lastResult;
  };
}

/** All currently injured Rikishi. */
export const selectInjuredRikishi = createSelector((world: WorldState): Rikishi[] => {
  const result: Rikishi[] = [];
  if (!world.rikishi) return result;
  for (const r of world.rikishi.values()) {
    if (r.injury?.isInjured || r.injured) result.push(r);
  }
  return result;
});

/** Events from this week and last week, bucketed by UI category. */
export const selectRecentEvents = createSelector((world: WorldState) => {
  const recentEvents = world.events?.log ? queryEvents(world, { limit: 120 }) : [];
  const thisWeek = world.week ?? 0;

  // Categorized bucket
  const buckets = {
    media: [] as EngineEvent[],
    economy: [] as EngineEvent[],
    scouting: [] as EngineEvent[],
    training: [] as EngineEvent[],
    career: [] as EngineEvent[],
    rivalry: [] as EngineEvent[],
    governance: [] as EngineEvent[],
    welfare: [] as EngineEvent[],
    basho: [] as EngineEvent[],
    milestone: [] as EngineEvent[],
    facility: [] as EngineEvent[],
    recoveries: [] as EngineEvent[],
  };

  for (const e of recentEvents) {
    if (e.week < thisWeek - 1 || e.week > thisWeek) continue;

    const status = typeof e.data?.status === "string" ? e.data.status : "";
    if (e.category === "injury" && (status === "recovery" || status === "treated"))
      buckets.recoveries.push(e);
    else if (e.category === "media" || e.type.includes("SCANDAL")) buckets.media.push(e);
    else if (e.category === "economy" || e.category === "sponsor") buckets.economy.push(e);
    else if (e.category === "scouting") buckets.scouting.push(e);
    else if (e.category === "training") buckets.training.push(e);
    else if (e.category === "career") buckets.career.push(e);
    else if (e.category === "rivalry") buckets.rivalry.push(e);
    else if (e.type.startsWith("GOVERNANCE") || e.category === "discipline")
      buckets.governance.push(e);
    else if (
      e.category === "welfare" ||
      e.type.startsWith("COMPLIANCE") ||
      e.type.startsWith("WELFARE")
    )
      buckets.welfare.push(e);
    else if (e.category === "basho" || e.category === "match") buckets.basho.push(e);
    else if (e.category === "milestone") buckets.milestone.push(e);
    else if (e.category === "facility") buckets.facility.push(e);
  }

  return buckets;
});
