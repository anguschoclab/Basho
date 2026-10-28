// src/presenters/selectors.ts
// =======================================================
// Performance-Optimized Selectors (P3)
// =======================================================

import type { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";
import type { RetiredRikishiSummary } from "@/engine/types/history";
import type { Heya } from "@/engine/types/heya";

// Re-export the canonical most-recent-first extractor so UI components can
// reach it without importing from src/engine/ (ESLint no-restricted-imports).
export { scanRecentEvents } from "@/engine/events/events";
export type { ScanRecentEventsOptions } from "@/engine/events/events";
import { sortStandings } from "@/engine/utils/sort";
import { getCachedPerception } from "@/presenters/uiDigest";
import { getKimarite, KIMARITE_REGISTRY } from "@/engine/bout/kimarite/kimariteRegistry";
import {
  getKimariteTargetShare,
  rarityFromShare,
  type KimariteRarity,
} from "@/constants/engine/kimariteFrequencies";

import { createSelector } from "@/engine/core/selectors";

export { selectInjuredRikishi, selectRecentEvents } from "@/engine/core/selectors";

/**
 * Select all Sekiwake and Komusubi for Ozeki promotion tracking.
 */
export const selectPromotionCandidates = createSelector((world: WorldState) => {
  const result: Rikishi[] = [];
  if (!world.rikishi) return result;
  for (const r of world.rikishi.values()) {
    if (!r.isRetired && (r.rank === "sekiwake" || r.rank === "komusubi")) {
      result.push(r);
    }
  }
  return result;
});

/**
 * Select all Ozeki for Yokozuna promotion tracking.
 */
export const selectYokozunaCandidates = createSelector((world: WorldState) => {
  const result: Rikishi[] = [];
  if (!world.rikishi) return result;
  for (const r of world.rikishi.values()) {
    if (!r.isRetired && r.rank === "ozeki") {
      result.push(r);
    }
  }
  return result;
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
 * Entries may be full Rikishi (pre-year-end-summarization) or compact
 * RetiredRikishiSummary objects (post-summarization). Callers should use
 * isRetiredRikishiSummary() to discriminate when accessing summary-only fields.
 */
export const selectRetiredRikishi = createSelector(
  (world: WorldState): Array<Rikishi | RetiredRikishiSummary> => {
    if (!world.historicalRikishi) return [];
    return Array.from(world.historicalRikishi.values());
  }
);

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
    const rosterSize = new Set(h.rikishiIds ?? []).size;
    if (h.funds < 0 && rosterSize <= 3) {
      results.push(h);
    }
  }
  return results.sort((a, b) => a.funds - b.funds); // worst debt first
});

export interface EngineStandingEntry {
  rikishi: Rikishi;
  wins: number;
  losses: number;
}

export const selectMakuuchiStandings = createSelector(
  (world: WorldState): EngineStandingEntry[] => {
    if (!world.currentBasho?.standings) return [];
    const standings = world.currentBasho.standings;
    const results: EngineStandingEntry[] = [];
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
);

// ─── Write-only state field selectors ─────────────────────────────────────────
// These surface previously write-only fields to the UI layer.

export const selectAwardLog = createSelector((world: WorldState) => {
  return world.awardLog ?? [];
});

export const selectKimariteStats = createSelector((world: WorldState) => {
  const stats = world.globalKimariteStats ?? {};
  const result: { kimarite: string; count: number }[] = [];
  for (const kimarite of Object.keys(stats)) {
    result.push({ kimarite, count: stats[kimarite] });
  }
  result.sort((a, b) => b.count - a.count);
  return result;
});

export interface KimaritePercentageRow {
  kimarite: string;
  name: string;
  count: number;
  /** Observed share of all recorded bout endings (0–100). */
  observedPct: number;
  /** Real-world makuuchi reference share (0–100). */
  realWorldPct: number;
  rarity: KimariteRarity;
}

/** Shared row builder for the Almanac "Techniques" view: joins a kimarite
 * count map with the registry (display names) and the real-world frequency
 * table (reference share + rarity tier). Honest data only — no fabricated
 * values. */
function buildKimariteRows(stats: Record<string, number>): KimaritePercentageRow[] {
  const total = Object.values(stats).reduce((a, b) => a + b, 0);
  if (total <= 0) return [];
  // Union of every registered kimarite plus any observed-but-unknown ids,
  // so the Techniques table always shows the complete technique list —
  // unobserved entries appear with count 0 and their real-world rarity.
  const ids = new Set<string>([...KIMARITE_REGISTRY.map((k) => k.id), ...Object.keys(stats)]);
  return [...ids]
    .map((kimarite) => {
      const def = getKimarite(kimarite);
      const share = getKimariteTargetShare(kimarite);
      const count = stats[kimarite] ?? 0;
      return {
        kimarite,
        name: def?.name ?? kimarite,
        count,
        observedPct: (count / total) * 100,
        realWorldPct: share * 100,
        rarity: rarityFromShare(share),
      };
    })
    .sort((a, b) => b.count - a.count || b.realWorldPct - a.realWorldPct);
}

/** Techniques view for the current era (globalKimariteStats resets yearly). */
export const selectKimaritePercentages = createSelector(
  (world: WorldState): KimaritePercentageRow[] => buildKimariteRows(world.globalKimariteStats ?? {})
);

/** Techniques view for all-time counts (allTimeKimariteStats never resets). */
export const selectAllTimeKimaritePercentages = createSelector(
  (world: WorldState): KimaritePercentageRow[] =>
    buildKimariteRows(world.allTimeKimariteStats ?? {})
);

/**
 * Observed share (0–100) of one technique this era — for BoutResultDisplay /
 * KimariteTag tooltips. Returns undefined when no bouts are recorded so the
 * UI can omit the line rather than fabricate a percentage.
 */
export function selectKimariteObservedShare(
  world: WorldState,
  kimariteId: string
): number | undefined {
  const stats = world.globalKimariteStats ?? {};
  const total = Object.values(stats).reduce((a, b) => a + b, 0);
  const count = stats[kimariteId];
  if (total <= 0 || !count) return undefined;
  return (count / total) * 100;
}

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
  return Object.values(registry.traits);
});

export const selectEncouragementLog = createSelector((world: WorldState) => {
  return world.encouragementLog ?? [];
});

export const selectYokozunaVacancyStreak = createSelector((world: WorldState) => {
  return world.yokozunaVacancyStreak ?? 0;
});
