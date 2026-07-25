// historyIndex.ts
// =======================================================
// History Index System v1.0
// Deterministic, JSON-safe searchable index over Basho history + snapshots
// =======================================================

import type { Id } from "./types/common";
import type { WorldState } from "./types/world";
import type { Division, RankPosition, BanzukeSnapshot } from "./types/banzuke";
import type { BashoName, BashoResult } from "./types/basho";
import { getRikishi } from "./queries";

/** Canon key for a basho (unique) */
export type BashoKey = `${number}-${1 | 2 | 3 | 4 | 5 | 6}`;

/** Helper to make a stable key */
export function makeBashoKey(year: number, bashoNumber: number): BashoKey {
  return `${year}-${bashoNumber as 1 | 2 | 3 | 4 | 5 | 6}` as BashoKey;
}

/** Minimal "what happened this basho" record for a rikishi */
export interface RikishiHistoryEntry {
  bashoKey: BashoKey;
  year: number;
  bashoNumber: 1 | 2 | 3 | 4 | 5 | 6;
  bashoName?: BashoName;
  rikishiId: Id;
  division?: Division;
  priorRank?: RankPosition;
  wins?: number;
  losses?: number;
  absences?: number;
  yusho?: boolean;
  junYusho?: boolean;
  ginoSho?: boolean;
  kantosho?: boolean;
  shukunsho?: boolean;
  kinboshiCount?: number;
}

/** Per-basho rollup for quick UI "History" page */
export interface BashoHistorySummary {
  bashoKey: BashoKey;
  year: number;
  bashoNumber: 1 | 2 | 3 | 4 | 5 | 6;
  bashoName: BashoName;
  yusho?: Id;
  junYusho?: Id[];
  ginoSho?: Id;
  kantosho?: Id;
  shukunsho?: Id;
  hasBanzukeSnapshot: boolean;
  sortKey: string;
}

/** The full JSON-safe index */
export interface HistoryIndex {
  version: "1.0.0";
  bashoKeys: BashoKey[];
  basho: Record<BashoKey, BashoHistorySummary>;
  banzukeByBasho: Record<BashoKey, BanzukeSnapshot>;
  rikishi: Record<Id, RikishiHistoryEntry[]>;
  lastSeenBashoForRikishi: Record<Id, BashoKey | undefined>;
}

/** Create empty index */
export function createEmptyHistoryIndex(): HistoryIndex {
  return {
    version: "1.0.0",
    bashoKeys: [],
    basho: {},
    banzukeByBasho: {},
    rikishi: {},
    lastSeenBashoForRikishi: {},
  };
}

/** Stable sort helper (chronological by basho key) */
function compareBashoKey(a: BashoKey, b: BashoKey): number {
  const [ay, an] = a.split("-").map(Number);
  const [by, bn] = b.split("-").map(Number);
  if (ay !== by) return ay - by;
  return an - bn;
}

function sortKeyFor(year: number, bashoNumber: number): string {
  const bn = String(bashoNumber).padStart(2, "0");
  return `${year}${bn}`;
}

/**
 * Build index from world history array.
 */
export function buildHistoryIndex(args: {
  world: WorldState;
  performanceByBasho?: Record<BashoKey, RikishiHistoryEntry[]>;
}): HistoryIndex {
  const { world, performanceByBasho } = args;
  const idx = createEmptyHistoryIndex();
  const history: BashoResult[] = world.history || [];

  for (const br of history) {
    const bashoKey = makeBashoKey(br.year, br.bashoNumber);
    const summary: BashoHistorySummary = {
      bashoKey,
      year: br.year,
      bashoNumber: br.bashoNumber as 1 | 2 | 3 | 4 | 5 | 6,
      bashoName: br.bashoName,
      yusho: br.yusho,
      junYusho: br.junYusho,
      ginoSho: br.ginoSho,
      kantosho: br.kantosho,
      shukunsho: br.shukunsho,
      hasBanzukeSnapshot: !!br.nextBanzuke,
      sortKey: sortKeyFor(br.year, br.bashoNumber),
    };

    idx.basho[bashoKey] = summary;
    idx.bashoKeys.push(bashoKey);

    if (br.nextBanzuke) {
      idx.banzukeByBasho[bashoKey] = br.nextBanzuke;
    }
  }

  idx.bashoKeys = Array.from(new Set(idx.bashoKeys)).sort(compareBashoKey);

  if (world.currentBanzuke) {
    const ck = makeBashoKey(world.currentBanzuke.year, world.currentBanzuke.bashoNumber);
    if (!idx.banzukeByBasho[ck]) idx.banzukeByBasho[ck] = world.currentBanzuke;
  }

  if (performanceByBasho) {
    for (const bk of Object.keys(performanceByBasho) as BashoKey[]) {
      const entries = performanceByBasho[bk] || [];
      for (const e of entries) {
        if (!idx.rikishi[e.rikishiId]) idx.rikishi[e.rikishiId] = [];
        idx.rikishi[e.rikishiId].push(e);
        idx.lastSeenBashoForRikishi[e.rikishiId] = bk;
      }
    }
  } else {
    for (const bk of idx.bashoKeys) {
      const br = idx.basho[bk];
      if (!br) continue;
      const { year, bashoNumber, bashoName } = br;

      if (br.yusho) {
        pushRikishiEntry(idx, br.yusho, {
          bashoKey: bk,
          year,
          bashoNumber,
          bashoName,
          yusho: true,
          rikishiId: br.yusho,
        });
      }
      for (const rid of br.junYusho || []) {
        pushRikishiEntry(idx, rid, {
          bashoKey: bk,
          year,
          bashoNumber,
          bashoName,
          junYusho: true,
          rikishiId: rid,
        });
      }
      if (br.ginoSho)
        pushRikishiEntry(idx, br.ginoSho, {
          bashoKey: bk,
          year,
          bashoNumber,
          bashoName,
          ginoSho: true,
          rikishiId: br.ginoSho,
        });
      if (br.kantosho)
        pushRikishiEntry(idx, br.kantosho, {
          bashoKey: bk,
          year,
          bashoNumber,
          bashoName,
          kantosho: true,
          rikishiId: br.kantosho,
        });
      if (br.shukunsho)
        pushRikishiEntry(idx, br.shukunsho, {
          bashoKey: bk,
          year,
          bashoNumber,
          bashoName,
          shukunsho: true,
          rikishiId: br.shukunsho,
        });
    }
  }

  sortRikishiLists(idx);
  return idx;
}

function sortRikishiLists(idx: HistoryIndex) {
  for (const rid of Object.keys(idx.rikishi)) {
    const list = idx.rikishi[rid];
    if (list) {
      idx.rikishi[rid] = list.sort((a, b) => compareBashoKey(a.bashoKey, b.bashoKey));
      idx.lastSeenBashoForRikishi[rid] = list.length ? list[list.length - 1].bashoKey : undefined;
    }
  }
}

function pushRikishiEntry(idx: HistoryIndex, rikishiId: Id, entry: RikishiHistoryEntry): void {
  if (!idx.rikishi[rikishiId]) idx.rikishi[rikishiId] = [];
  idx.rikishi[rikishiId]!.push(entry);
  idx.lastSeenBashoForRikishi[rikishiId] = entry.bashoKey;
}

export function listBashoSummaries(index: HistoryIndex): BashoHistorySummary[] {
  const out: BashoHistorySummary[] = [];
  for (const k of index.bashoKeys) {
    const b = index.basho[k];
    if (b) out.push(b);
  }
  return out;
}

export function getBashoSummary(
  index: HistoryIndex,
  year: number,
  bashoNumber: 1 | 2 | 3 | 4 | 5 | 6
): BashoHistorySummary | null {
  const k = makeBashoKey(year, bashoNumber);
  return index.basho[k] || null;
}

export function getRikishiHistory(index: HistoryIndex, rikishiId: Id): RikishiHistoryEntry[] {
  return index.rikishi[rikishiId] ? [...index.rikishi[rikishiId]!] : [];
}

export function indexBashoResult(world: WorldState, bashoResult: BashoResult): void {
  if (!world.historyIndex) {
    world.historyIndex = createEmptyHistoryIndex();
  }

  const idx = world.historyIndex;
  const bashoKey = makeBashoKey(bashoResult.year, bashoResult.bashoNumber);

  if (idx.basho[bashoKey]) return;

  const summary: BashoHistorySummary = {
    bashoKey,
    year: bashoResult.year,
    bashoNumber: bashoResult.bashoNumber as 1 | 2 | 3 | 4 | 5 | 6,
    bashoName: bashoResult.bashoName,
    yusho: bashoResult.yusho,
    junYusho: bashoResult.junYusho,
    ginoSho: bashoResult.ginoSho,
    kantosho: bashoResult.kantosho,
    shukunsho: bashoResult.shukunsho,
    hasBanzukeSnapshot: !!bashoResult.nextBanzuke,
    sortKey: `${bashoResult.year}${String(bashoResult.bashoNumber).padStart(2, "0")}`,
  };

  idx.basho[bashoKey] = summary;
  idx.bashoKeys.push(bashoKey);
  idx.bashoKeys.sort(compareBashoKey);

  if (bashoResult.nextBanzuke) {
    idx.banzukeByBasho[bashoKey] = bashoResult.nextBanzuke;
  }

  if (bashoResult.yusho) {
    pushRikishiEntry(idx, bashoResult.yusho, {
      bashoKey,
      year: bashoResult.year,
      bashoNumber: bashoResult.bashoNumber as 1 | 2 | 3 | 4 | 5 | 6,
      bashoName: bashoResult.bashoName,
      yusho: true,
      rikishiId: bashoResult.yusho,
    });
  }
  for (const rid of bashoResult.junYusho || []) {
    pushRikishiEntry(idx, rid, {
      bashoKey,
      year: bashoResult.year,
      bashoNumber: bashoResult.bashoNumber as 1 | 2 | 3 | 4 | 5 | 6,
      bashoName: bashoResult.bashoName,
      junYusho: true,
      rikishiId: rid,
    });
  }
  if (bashoResult.ginoSho)
    pushRikishiEntry(idx, bashoResult.ginoSho, {
      bashoKey,
      year: bashoResult.year,
      bashoNumber: bashoResult.bashoNumber as 1 | 2 | 3 | 4 | 5 | 6,
      bashoName: bashoResult.bashoName,
      ginoSho: true,
      rikishiId: bashoResult.ginoSho,
    });
  if (bashoResult.kantosho)
    pushRikishiEntry(idx, bashoResult.kantosho, {
      bashoKey,
      year: bashoResult.year,
      bashoNumber: bashoResult.bashoNumber as 1 | 2 | 3 | 4 | 5 | 6,
      bashoName: bashoResult.bashoName,
      kantosho: true,
      rikishiId: bashoResult.kantosho,
    });
  if (bashoResult.shukunsho)
    pushRikishiEntry(idx, bashoResult.shukunsho, {
      bashoKey,
      year: bashoResult.year,
      bashoNumber: bashoResult.bashoNumber as 1 | 2 | 3 | 4 | 5 | 6,
      bashoName: bashoResult.bashoName,
      shukunsho: true,
      rikishiId: bashoResult.shukunsho,
    });

  const bashoState = world.currentBasho;
  const standingsMap = bashoState?.standings;
  if (standingsMap) {
    const entries =
      standingsMap instanceof Map ? standingsMap.entries() : Object.entries(standingsMap);

    for (const [rid, stats] of entries) {
      const s = stats as { wins: number; losses: number };
      const historyArr = idx.rikishi[rid];
      const existing = historyArr ? historyArr.find((e) => e.bashoKey === bashoKey) : undefined;

      if (existing) {
        existing.wins = s.wins;
        existing.losses = s.losses;
      } else {
        const r = getRikishi(world, rid);
        pushRikishiEntry(idx, rid, {
          bashoKey,
          year: bashoResult.year,
          bashoNumber: bashoResult.bashoNumber as 1 | 2 | 3 | 4 | 5 | 6,
          bashoName: bashoResult.bashoName,
          rikishiId: rid,
          division: r?.division,
          wins: s.wins,
          losses: s.losses,
        });
      }
    }
  }
}
