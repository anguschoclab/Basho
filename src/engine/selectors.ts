import type { WorldState } from "./types/world";
import type { Rikishi } from "./types/rikishi";
import type { Heya } from "./types/heya";
import type { Id } from "./types/common";

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
  for (const r of world.rikishi.values()) {
    if (!r.isRetired) {
      result.push(r);
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
 * Returns all retired rikishi from the active roster map.
 * (Historically retired rikishi live in world.historicalRikishi.)
 */
export function selectRetiredRikishi(world: WorldState): Rikishi[] {
  const result: Rikishi[] = [];
  for (const r of world.rikishi.values()) {
    if (r.isRetired) result.push(r);
  }
  return result;
}

/**
 * Returns heyas with critical welfare risk.
 * Triggered when welfareRisk >= 55 (investigation threshold) or
 * complianceState is "investigation" / "sanctioned".
 */
export function selectHeyasWithCriticalWelfare(world: WorldState): Heya[] {
  const result: Heya[] = [];
  for (const h of world.heyas.values()) {
    const ws = h.welfareState;
    if (!ws) continue;
    const criticalCompliance =
      ws.complianceState === "investigation" || ws.complianceState === "sanctioned";
    if (ws.welfareRisk >= 55 || criticalCompliance) result.push(h);
  }
  return result;
}

/**
 * Returns heyas that are candidates for merger:
 * negative funds (net debt) AND a roster of 3 or fewer active rikishi.
 */
export function selectMergerCandidates(world: WorldState): Heya[] {
  const result: Heya[] = [];
  for (const h of world.heyas.values()) {
    const isInDebt = h.funds < 0;
    const hasSmallRoster = (h.rikishiIds?.length ?? 0) <= 3;
    if (isInDebt && hasSmallRoster) result.push(h);
  }
  return result;
}
