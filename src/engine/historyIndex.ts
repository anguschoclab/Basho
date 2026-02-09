// historyIndex.ts
// =======================================================
// History Index System v1.0
// Deterministic, JSON-safe searchable index over Basho history + snapshots
// =======================================================
//
// Purpose:
// - Provide fast queries for UI + narrative systems without scanning full Almanac/History arrays.
// - Keep persisted state JSON-safe (no Map/Set).
// - Support both:
//   (A) "World history" (basho results, banzuke snapshots)
//   (B) "Rikishi career ledger" style lookups (by basho -> performance summary)
//
// Fits alongside:
// - almanac.ts (canonical historical memory / records)
// - saveload.ts (persistence / migrations)
// - uiDigest.ts (builds UI payloads efficiently)
//
// Notes:
// - This module does NOT mutate WorldState unless you call `rebuildHistoryIndexIntoWorld`
//   (provided as an optional helper).
// - If you don’t want to store the index in save files, you can rebuild it on load.
//
// Assumptions / Compat:
// - WorldState.history: BashoResult[]
// - WorldState.currentBanzuke?: BanzukeSnapshot
// - BashoResult may have nextBanzuke?: BanzukeSnapshot
// - If you have richer performance logs elsewhere, you can extend `RikishiHistoryEntry`.

import type {
  Id,
  WorldState,
  Division,
  RankPosition,
  BashoName,
  BanzukeSnapshot,
  BashoResult
} from "./types";

/** Canon key for a basho (unique) */
export type BashoKey = `${number}-${1 | 2 | 3 | 4 | 5 | 6}`;

/** Helper to make a stable key */
export function makeBashoKey(year: number, bashoNumber: 1 | 2 | 3 | 4 | 5 | 6): BashoKey {
  return `${year}-${bashoNumber}` as BashoKey;
}

/** Minimal "what happened this basho" record for a rikishi */
export interface RikishiHistoryEntry {
  bashoKey: BashoKey;
  year: number;
  bashoNumber: 1 | 2 | 3 | 4 | 5 | 6;
  bashoName?: BashoName;

  /** The rikishi this entry is for */
  rikishiId?: string;

  division?: Division;

  /** placement going in (if known) */
  priorRank?: RankPosition;

  /** outcome */
  wins?: number;
  losses?: number;
  absences?: number;

  /** flags */
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

  /** winners (ids) */
  yusho?: Id;
  junYusho?: Id[];

  ginoSho?: Id;
  kantosho?: Id;
  shukunsho?: Id;

  /** snapshot pointers */
  hasBanzukeSnapshot: boolean;

  /** deterministic sort helper */
  sortKey: string; // `${year}${bashoNumber.toString().padStart(2,'0')}`
}

/** The full JSON-safe index */
export interface HistoryIndex {
  version: "1.0.0";

  /** All basho keys in chronological order */
  bashoKeys: BashoKey[];

  /** Per basho summary */
  basho: Record<BashoKey, BashoHistorySummary>;

  /** Optional banzuke snapshots keyed by basho */
  banzukeByBasho: Record<BashoKey, BanzukeSnapshot>;

  /** Per rikishi list of entries (chronological) */
  rikishi: Record<Id, RikishiHistoryEntry[]>;

  /** Convenience: last known entry pointer */
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
    lastSeenBashoForRikishi: {}
  };
}

/** Stable sort helper (chronological by basho key) */
function compareBashoKey(a: BashoKey, b: BashoKey): number {
  // keys are "YYYY-N"
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
 * Optionally pass `performanceByBasho` if you have per-rikishi basho performance logs
 * (e.g., from almanac). If omitted, rikishi entries will include only prize/yusho flags
 * when derivable from BashoResult.
 */
export function buildHistoryIndex(args: {
  world: WorldState;
  /** Optional richer per-rikishi performance input */
  performanceByBasho?: Record<BashoKey, RikishiHistoryEntry[]>;
}): HistoryIndex {
  const { world, performanceByBasho } = args;

  const idx = createEmptyHistoryIndex();

  const history: BashoResult[] = Array.isArray(world.history) ? world.history : [];

  // Build basho summaries + snapshots
  for (const br of history) {
    const bashoKey = makeBashoKey(br.year, br.bashoNumber);
    const summary: BashoHistorySummary = {
      bashoKey,
      year: br.year,
      bashoNumber: br.bashoNumber,
      bashoName: br.bashoName,
      yusho: br.yusho,
      junYusho: br.junYusho,
      ginoSho: br.ginoSho,
      kantosho: br.kantosho,
      shukunsho: br.shukunsho,
      hasBanzukeSnapshot: !!br.nextBanzuke,
      sortKey: sortKeyFor(br.year, br.bashoNumber)
    };

    idx.basho[bashoKey] = summary;
    idx.bashoKeys.push(bashoKey);

    if (br.nextBanzuke) {
      idx.banzukeByBasho[bashoKey] = br.nextBanzuke;
    }
  }

  // Ensure chronological order and uniqueness
  idx.bashoKeys = Array.from(new Set(idx.bashoKeys)).sort(compareBashoKey);

  // Add any "current" banzuke if it exists but isn't attached to the last BashoResult
  // (useful mid-cycle or after generating banzuke separately).
  if (world.currentBanzuke) {
    const ck = makeBashoKey(world.currentBanzuke.year, world.currentBanzuke.bashoNumber);
    if (!idx.banzukeByBasho[ck]) idx.banzukeByBasho[ck] = world.currentBanzuke;
  }

  // Build per-rikishi lists (best-effort)
  if (performanceByBasho) {
    // Use provided detailed entries
    for (const bk of Object.keys(performanceByBasho) as BashoKey[]) {
      const entries = performanceByBasho[bk] || [];
      for (const e of entries) {
        if (!idx.rikishi[e.rikishiId]) idx.rikishi[e.rikishiId] = [];
        idx.rikishi[e.rikishiId].push(e);
        idx.lastSeenBashoForRikishi[e.rikishiId] = bk;
      }
    }

    // Sort each list
    for (const rid of Object.keys(idx.rikishi)) {
      idx.rikishi[rid] = idx.rikishi[rid].sort((a, b) => compareBashoKey(a.bashoKey, b.bashoKey));
      idx.lastSeenBashoForRikishi[rid] = idx.rikishi[rid].length
        ? idx.rikishi[rid][idx.rikishi[rid].length - 1].bashoKey
        : undefined;
    }
  } else {
    // No detailed logs: infer minimal entries from winners/prizes
    for (const bk of idx.bashoKeys) {
      const br = idx.basho[bk];
      const year = br.year;
      const bashoNumber = br.bashoNumber;

      // Yusho
      if (br.yusho) {
        pushRikishiEntry(idx, br.yusho, {
          bashoKey: bk,
          year,
          bashoNumber,
          bashoName: br.bashoName,
          yusho: true
        });
      }

      // Jun-yusho
      for (const rid of br.junYusho || []) {
        pushRikishiEntry(idx, rid, {
          bashoKey: bk,
          year,
          bashoNumber,
          bashoName: br.bashoName,
          junYusho: true
        });
      }

      // Special prizes (best-effort)
      if (br.ginoSho) pushRikishiEntry(idx, br.ginoSho, { bashoKey: bk, year, bashoNumber, bashoName: br.bashoName, ginoSho: true });
      if (br.kantosho) pushRikishiEntry(idx, br.kantosho, { bashoKey: bk, year, bashoNumber, bashoName: br.bashoName, kantosho: true });
      if (br.shukunsho) pushRikishiEntry(idx, br.shukunsho, { bashoKey: bk, year, bashoNumber, bashoName: br.bashoName, shukunsho: true });
    }

    // Sort each list
    for (const rid of Object.keys(idx.rikishi)) {
      idx.rikishi[rid] = idx.rikishi[rid].sort((a, b) => compareBashoKey(a.bashoKey, b.bashoKey));
      idx.lastSeenBashoForRikishi[rid] = idx.rikishi[rid].length
        ? idx.rikishi[rid][idx.rikishi[rid].length - 1].bashoKey
        : undefined;
    }
  }

  return idx;
}

function pushRikishiEntry(idx: HistoryIndex, rikishiId: Id, entry: RikishiHistoryEntry): void {
  if (!idx.rikishi[rikishiId]) idx.rikishi[rikishiId] = [];
  idx.rikishi[rikishiId].push({ rikishiId, ...entry } as any);
  idx.lastSeenBashoForRikishi[rikishiId] = entry.bashoKey;
}

/** =======================================================
 *  Query helpers (pure, UI-friendly)
 *  ======================================================= */

export function listBashoSummaries(index: HistoryIndex): BashoHistorySummary[] {
  return index.bashoKeys.map(k => index.basho[k]).filter(Boolean);
}

export function getBashoSummary(index: HistoryIndex, year: number, bashoNumber: 1 | 2 | 3 | 4 | 5 | 6): BashoHistorySummary | null {
  const k = makeBashoKey(year, bashoNumber);
  return index.basho[k] || null;
}

export function getBanzukeSnapshotFor(index: HistoryIndex, year: number, bashoNumber: 1 | 2 | 3 | 4 | 5 | 6): BanzukeSnapshot | null {
  const k = makeBashoKey(year, bashoNumber);
  return index.banzukeByBasho[k] || null;
}

export function getRikishiHistory(index: HistoryIndex, rikishiId: Id): RikishiHistoryEntry[] {
  return index.rikishi[rikishiId] ? [...index.rikishi[rikishiId]] : [];
}

export function getLastSeenBasho(index: HistoryIndex, rikishiId: Id): BashoKey | undefined {
  return index.lastSeenBashoForRikishi[rikishiId];
}

/** =======================================================
 *  Optional: attach index to world (non-invasive pattern)
 *  ======================================================= */

export interface WorldWithHistoryIndex extends WorldState {
  historyIndex?: HistoryIndex;
}

/**
 * Rebuild index and attach it onto world (non-canonical helper).
 * Useful if you want world.historyIndex available for UI without recomputation.
 */
export function rebuildHistoryIndexIntoWorld(world: WorldWithHistoryIndex, performanceByBasho?: Record<BashoKey, RikishiHistoryEntry[]>): HistoryIndex {
  const idx = buildHistoryIndex({ world, performanceByBasho });
  world.historyIndex = idx;
  return idx;
}
