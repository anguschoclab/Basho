/**
 * events.ts
 * =======================================================
 * Canon Event Infrastructure (A11) - Bard Engine v2.2
 * - WorldState.events is the authoritative append-only log (JSON-safe).
 * - Deterministic IDs and dedupe keys prevent double-logging.
 *
 * EventBus factory methods live in ./EventBus.ts
 */

import { rngForWorld } from "./rng";
import { DEFAULT_START_YEAR } from "../constants/engine/calendar";
import type { WorldState } from "./types/world";
import {
  type EngineEvent,
  type EventsState,
  type EventCategory,
  type EventPhase,
  type EventImportance,
  type EventScope,
  type EngineEventType,
  type NarrativeContext,
} from "./types/events";
export type {
  EngineEvent,
  EventsState,
  EventCategory,
  EventPhase,
  EventImportance,
  EventScope,
} from "./types/events";
import type { Id } from "./types/common";

export { EventBus } from "./EventBus";

/**
 * Ensure events state exists on the world object, initializing it if needed.
 *
 * **Coordinator-only:** This function mutates `world.events` in-place and must
 * only be called from the coordinator layer (`ImpactResolver`). Calling it from
 * within simulation phases violates the pure pipeline contract — simulation
 * phases must queue events via `ImpactBuilder.logEvent()` → `StateImpact.events[]`
 * and let the `ImpactResolver` apply them atomically after all phases complete.
 */
export function ensureEventsState(world: WorldState): EventsState {
  if (world.events && world.events.version && Array.isArray(world.events.log)) {
    if (!world.events.dedupe) world.events.dedupe = {};
    return world.events as EventsState;
  }
  world.events = { version: "1.0.0", log: [], dedupe: {} }; // @world-builder
  return world.events;
}

/** Defines the structure for log engine event params. */
interface LogEngineEventParams {
  type: EngineEventType;
  category: EventCategory;
  phase?: EventPhase;
  importance?: EventImportance;
  scope?: EventScope;
  heyaId?: Id;
  rikishiId?: Id;
  title: string;
  summary: string;
  data: NarrativeContext;
  tags?: string[];
  causalEventId?: Id;
  dedupeKey?: string;
}

/**
 * Log an engine event.
 *
 * CONTRACT: This function MUTATES `world.events` directly.
 * Do NOT call this function (or `EventBus` methods) directly from inside pure simulation phases.
 * Instead, simulation phases must push event definitions to `StateImpact.events`,
 * which will be applied atomically by `ImpactResolver`.
 *
 * This function also relies on `world.dayIndexGlobal` to scope deduplication.
 */
export function logEngineEvent(
  world: WorldState,
  params: LogEngineEventParams
): EngineEvent | undefined {
  const events = ensureEventsState(world);

  const year = world.year ?? DEFAULT_START_YEAR;
  const week = world.calendar?.currentWeek ?? world.week ?? 0;
  const month = world.calendar?.month ?? 1;
  const day = world.calendar?.currentDay ?? 1;

  const baseDedupeKey =
    params.dedupeKey ??
    `${year}|${week}|${params.type}|${params.scope ?? "world"}|${params.heyaId ?? ""}|${params.rikishiId ?? ""}|${params.title}`;

  // Include day index to scope deduplication to current tick only
  const dayIndex = world.dayIndexGlobal ?? 0;

  // Dedupe keys are versioned with `@dayIndex`, so keys from prior days can
  // never match. Reset the map on day rollover instead of letting it grow
  // unboundedly — ImpactResolver detaches (copies) this map for every
  // eventful impact, so dead keys have real cost in long sims.
  if (events.dedupeDay !== dayIndex) {
    events.dedupe = {};
    events.dedupeDay = dayIndex;
  }

  const versionedDedupeKey = `${baseDedupeKey}@${dayIndex}`;

  // On a dedupe hit return the ORIGINAL event (not the tail of the log —
  // `log[len-1]` silently returned an unrelated event once anything else
  // logged in between). Same-day hits sit near the end of the log, so scan
  // backward. If the original rolled off the live cap the hit yields nothing.
  const dedupedId = events.dedupe[versionedDedupeKey];
  if (dedupedId) {
    for (let i = events.log.length - 1; i >= 0; i--) {
      const e = events.log[i];
      if (e.id === dedupedId) return e;
    }
    return undefined;
  }

  const idRngLabel = `${baseDedupeKey}::${events.log.length}`;
  const rng = rngForWorld(world, "events", idRngLabel);
  const id = rng.uuid("EV");

  const ev: EngineEvent = {
    id,
    type: params.type,
    causalEventId: params.causalEventId,
    year,
    week,
    month,
    day,
    phase: params.phase ?? "weekly",
    category: params.category,
    importance: params.importance ?? "minor",
    scope: params.scope ?? "world",
    heyaId: params.heyaId,
    rikishiId: params.rikishiId,
    title: params.title,
    summary: params.summary,
    data: params.data,
    tags: params.tags ?? [],
  };

  events.log.push(ev);
  events.dedupe[versionedDedupeKey] = ev.id;

  // Bound the live log. Noise events (training deltas, narrative flavor,
  // per-bout records) accumulate ~10k/basho and were never pruned — the
  // serialized world grew ~12MB per basho, which OOMs the renderer's
  // save/sync paths within a year. Durable classes stay regardless of age
  // (long-range checks like hasHadKanrekiCeremony, gomenfuda counts, and
  // retirement ceremonies scan them); the rest roll off past the cap.
  const liveLen = events.log.length;
  if (liveLen > MAX_LIVE_EVENT_LOG + EVENT_LOG_TRIM_SLACK) {
    const cutoff = liveLen - MAX_LIVE_EVENT_LOG;
    events.log = events.log.filter((e, i) => i >= cutoff || isDurableEvent(e));
  }
  return ev;
}

/** Max unprotected entries retained in the live event log. */
export const MAX_LIVE_EVENT_LOG = 10_000;
/** Overshoot allowed before a trim pass runs (amortizes the O(n) filter). */
export const EVENT_LOG_TRIM_SLACK = 2_000;

/** Events with durable semantics — kept regardless of the rolling cap. */
export function isDurableEvent(e: Pick<EngineEvent, "category" | "importance">): boolean {
  return (
    e.importance === "headline" ||
    e.category === "career" ||
    e.category === "basho" ||
    e.category === "milestone" ||
    e.category === "discipline" ||
    e.category === "promotion"
  );
}

/**
 * Query events.
 */
const IMPORTANCE_SCORE: Record<EventImportance, number> = {
  minor: 0,
  notable: 1,
  major: 2,
  headline: 3,
};

/** Filter options for {@link scanRecentEvents}. */
export interface ScanRecentEventsOptions {
  limit?: number;
  types?: readonly string[];
  category?: EventCategory;
  scope?: EventScope;
  heyaId?: Id;
  rikishiId?: Id;
  minImportance?: EventImportance;
}

/**
 * Canonical most-recent-first extraction over the append-only `events.log`.
 *
 * The log is chronological — the only writers are `logEngineEvent`'s `push`
 * and an order-preserving eviction `filter` — so scanning backwards collects
 * the most recent matches in O(N) worst case (typically O(k)), then a
 * defensive re-sort of the bounded result by (year, week, day) descending
 * guards the contract against any future non-append-only writer. Events
 * sharing a timestamp keep insertion-recency order (later-pushed = more
 * recent). Callers should NOT chain a `.filter().sort().slice()` pipeline on
 * the raw log — use this.
 */
export function scanRecentEvents(
  log: readonly EngineEvent[] | undefined,
  opts: ScanRecentEventsOptions = {}
): EngineEvent[] {
  if (!log || log.length === 0) return [];
  const typesSet = opts.types?.length ? new Set(opts.types) : undefined;
  const minImp = opts.minImportance !== undefined ? IMPORTANCE_SCORE[opts.minImportance] : -1;
  const limit = opts.limit ?? Infinity;

  const out: EngineEvent[] = [];
  for (let i = log.length - 1; i >= 0 && out.length < limit; i--) {
    const e = log[i];
    if (typesSet && !typesSet.has(e.type)) continue;
    if (opts.category && e.category !== opts.category) continue;
    if (opts.scope && e.scope !== opts.scope) continue;
    if (opts.heyaId && e.heyaId !== opts.heyaId) continue;
    if (opts.rikishiId && e.rikishiId !== opts.rikishiId) continue;
    if (minImp >= 0 && IMPORTANCE_SCORE[e.importance ?? "minor"] < minImp) continue;
    out.push(e);
  }

  if (out.length > 1) {
    out.sort((a, b) => {
      const ta = a.year * 1e6 + a.week * 100 + (a.day ?? 0);
      const tb = b.year * 1e6 + b.week * 100 + (b.day ?? 0);
      return tb - ta;
    });
  }
  return out;
}

export function queryEvents(
  world: WorldState,
  filters: {
    limit?: number;
    category?: EventCategory;
    scope?: EventScope;
    heyaId?: Id;
    rikishiId?: Id;
    minImportance?: EventImportance;
    types?: string[];
  }
): EngineEvent[] {
  const events = ensureEventsState(world).log;
  return scanRecentEvents(events, {
    limit: filters.limit ?? 50,
    category: filters.category,
    scope: filters.scope,
    heyaId: filters.heyaId,
    rikishiId: filters.rikishiId,
    types: filters.types,
    minImportance: filters.minImportance,
  });
}
