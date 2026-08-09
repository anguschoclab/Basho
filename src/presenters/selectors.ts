// src/presenters/selectors.ts
// =======================================================
// Performance-Optimized Selectors (P3)
// =======================================================

import type { WorldState } from "../engine/types/world";
import type { Rikishi } from "../engine/types/rikishi";
import type { Heya } from "../engine/types/heya";
import type { EngineEvent } from "../engine/types/events";
import { queryEvents } from "../engine/events";
import { sortStandings } from "../engine/utils/sort";
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
  if (!world.rikishi) return [];
  const result: Rikishi[] = [];
  for (const r of world.rikishi.values()) result.push(r);
  return result;
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
  for (const rid in kadobanMap) {
    const r = world.rikishi.get(rid);
    if (r) entries.push(r);
  }
  return entries;
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
  if (!world.historicalRikishi) return [];
  const result: Rikishi[] = [];
  for (const r of world.historicalRikishi.values()) result.push(r);
  return result;
});

/**
 * Select heyas with critical welfare risk (welfareRisk >= 55 or non-compliant).
 */
export const selectHeyasWithCriticalWelfare = createSelector((world: WorldState): Heya[] => {
  const results: Heya[] = [];
  if (!world.heyas) return results;

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

  for (const h of world.heyas.values()) {
    if (h.id === world.playerHeyaId) continue;
    const rosterSize = h.rikishiIds?.length ?? 0;
    if (h.funds < 0 && rosterSize <= 3) {
      results.push(h);
    }
  }
  return results.sort((a, b) => a.funds - b.funds); // worst debt first
});

export interface StandingEntry {
  rikishi: Rikishi;
  wins: number;
  losses: number;
}

export function selectMakuuchiStandings(world: WorldState): StandingEntry[] {
  if (!world.currentBasho?.standings) return [];
  const standings = world.currentBasho.standings;
  const results: StandingEntry[] = [];
  for (const r of world.rikishi.values()) {
    if (r.division === "makuuchi") {
      results.push({
        rikishi: r,
        wins: standings.get(r.id)?.wins || 0,
        losses: standings.get(r.id)?.losses || 0,
      });
    }
  }
  return sortStandings(results);
}

// ─── Write-only state field selectors ─────────────────────────────────────────
// These surface previously write-only fields to the UI layer.

export const selectAwardLog = createSelector((world: WorldState) => {
  return world.awardLog ?? [];
});

export const selectKimariteStats = createSelector((world: WorldState) => {
  const stats = world.globalKimariteStats ?? {};
  return Object.entries(stats)
    .sort((a, b) => b[1] - a[1])
    .map(([kimarite, count]) => ({ kimarite, count }));
});

export const selectPlayerKnowledge = createSelector((world: WorldState) => {
  return world.playerKnowledge ?? { scouting: {}, bookmarks: [] };
});

export const selectAlmanacSnapshots = createSelector((world: WorldState) => {
  return world.almanacSnapshots ?? [];
});

export const selectClosedHeyas = createSelector((world: WorldState) => {
  if (!world.closedHeyas) return [];
  const result: Array<{ id: string; name?: string; closedYear?: number }> = [];
  for (const [id, record] of world.closedHeyas) {
    result.push({
      id,
      name: (record as { name?: string }).name,
      closedYear: (record as { closedYear?: number }).closedYear,
    });
  }
  return result;
});

export const selectBloodlineRegistry = createSelector((world: WorldState) => {
  const registry = world.bloodlineRegistry;
  if (!registry) return [];
  return Object.entries(registry.traits).map(([traitId, trait]) => ({
    traitId,
    ...(trait as unknown as Record<string, unknown>),
  }));
});

export const selectEncouragementLog = createSelector((world: WorldState) => {
  return world.encouragementLog ?? [];
});

export const selectYokozunaVacancyStreak = createSelector((world: WorldState) => {
  return world.yokozunaVacancyStreak ?? 0;
});
