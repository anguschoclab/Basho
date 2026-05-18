// src/presenters/selectors.ts
// =======================================================
// Performance-Optimized Selectors (P3)
// =======================================================

import type { WorldState } from "../engine/types/world";
import type { Rikishi } from "../engine/types/rikishi";
import type { Heya } from "../engine/types/heya";
import type { EngineEvent } from "../engine/types/events";
import { queryEvents } from "../engine/events";
import { getCachedPerception } from "./uiDigest";

/**
 * Simple memoization helper for selectors that depend only on WorldState.
 * Uses reference equality for the world object.
 */
function createSelector<T>(fn: (world: WorldState) => T) {
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

/**
 * Memoized selector for all Rikishi as an array.
 */
const selectAllRikishi = createSelector((world: WorldState): Rikishi[] => {
  return world.rikishi ? Array.from(world.rikishi.values()) : [];
});

/**
 * Memoized selector for all injured Rikishi.
 */
export const selectInjuredRikishi = createSelector((world: WorldState): Rikishi[] => {
  const all = selectAllRikishi(world);
  return all.filter((r) => r.injury?.isInjured || r.injured);
});

/**
 * Memoized selector for events filtered by category and week.
 */
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
  };

  for (const e of recentEvents) {
    if (e.week < thisWeek - 1 || e.week > thisWeek) continue;

    if (e.category === "media" || e.type.includes("SCANDAL")) buckets.media.push(e);
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
  }

  return buckets;
});

/**
 * Select all Sekiwake and Komusubi for Ozeki promotion tracking.
 */
export const selectPromotionCandidates = createSelector((world: WorldState) => {
  return selectAllRikishi(world).filter(
    (r) => !r.isRetired && (r.rank === "sekiwake" || r.rank === "komusubi")
  );
});

/**
 * Select all Ozeki for Yokozuna promotion tracking.
 */
export const selectYokozunaCandidates = createSelector((world: WorldState) => {
  return selectAllRikishi(world).filter((r) => !r.isRetired && r.rank === "ozeki");
});

/**
 * Select all Ozeki in Kadoban status.
 */
export const selectKadobanRikishi = createSelector((world: WorldState): Rikishi[] => {
  const kadobanMap = world.ozekiKadoban ?? {};
  const entries: Rikishi[] = [];
  if (!world.rikishi) return entries;
  for (const rid of Object.keys(kadobanMap)) {
    const r = world.rikishi.get(rid);
    if (r) entries.push(r);
  }
  return entries;
});

/**
 * Select all Rikishi grouped by Heya ID.
 */
export const selectRikishiByHeya = createSelector((world: WorldState): Map<string, Rikishi[]> => {
  const map = new Map<string, Rikishi[]>();
  for (const r of selectAllRikishi(world)) {
    const list = map.get(r.heyaId) || [];
    list.push(r);
    map.set(r.heyaId, list);
  }
  return map;
});

/**
 * Select top rivals for the dashboard widget.
 */
export const selectTopRivals = createSelector((world: WorldState) => {
  const entries: {
    id: string;
    name: string;
    prestige: string;
    roster: string;
    morale: string;
    heat: string;
  }[] = [];
  const playerHeyaId = world.playerHeyaId;
  if (!world.heyas) return entries;
  for (const heya of world.heyas.values()) {
    if (heya.id === playerHeyaId) continue;
    const p = getCachedPerception(world, heya.id);
    entries.push({
      id: heya.id,
      name: p.heyaName,
      prestige: p.prestigeBand,
      roster: p.rosterStrengthBand,
      morale: p.moraleBand,
      heat: p.stableMediaHeatBand,
    });
  }
  const order = ["elite", "respected", "modest", "struggling", "unknown"];
  entries.sort((a, b) => order.indexOf(a.prestige) - order.indexOf(b.prestige));
  return entries.slice(0, 6);
});

/**
 * Select all retired rikishi (from historicalRikishi).
 */
export const selectRetiredRikishi = createSelector((world: WorldState): Rikishi[] => {
  return world.historicalRikishi ? Array.from(world.historicalRikishi.values()) : [];
});

/**
 * Select heyas with critical welfare risk (welfareRisk >= 55 or non-compliant).
 */
export const selectHeyasWithCriticalWelfare = createSelector((world: WorldState): Heya[] => {
  const results: Heya[] = [];
  if (!world.heyas) return results;

  // ⚡ Bolt Optimization: Use a direct for...of loop instead of Array.from().filter()
  // to avoid O(N) array allocations
  for (const h of world.heyas.values()) {
    const ws = h.welfareState;
    if (!ws) continue;
    if (
      ws.welfareRisk >= 55 ||
      ws.complianceState === "sanctioned" ||
      ws.complianceState === "investigation"
    ) {
      results.push(h);
    }
  }
  return results;
});

/**
 * Select heyas that are merger candidates: in debt with a small roster.
 * Excludes the player stable.
 */
export const selectMergerCandidates = createSelector((world: WorldState): Heya[] => {
  const results: Heya[] = [];
  if (!world.heyas) return results;

  // ⚡ Bolt Optimization: Use a direct for...of loop instead of Array.from().filter()
  for (const h of world.heyas.values()) {
    if (h.id === world.playerHeyaId) continue;
    const rosterSize = h.rikishiIds?.length ?? 0;
    if (h.funds < 0 && rosterSize <= 3) {
      results.push(h);
    }
  }
  return results.sort((a, b) => a.funds - b.funds); // worst debt first
});
