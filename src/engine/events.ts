/**
 * events.ts
 * =======================================================
 * Canon Event Infrastructure (A11) - Bard Engine v2.2
 * - WorldState.events is the authoritative append-only log (JSON-safe).
 * - Deterministic IDs and dedupe keys prevent double-logging.
 *
 * EventBus factory methods live in ./EventBus.ts
 */

import { stableTieBreak } from "./utils/sort";
import { rngForWorld } from "./rng";
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
  truthLevel?: "public" | "limited" | "private";
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
export function logEngineEvent(world: WorldState, params: LogEngineEventParams): EngineEvent {
  const events = ensureEventsState(world);

  const year = world.calendar?.year ?? world.year ?? 2025;
  const week = world.calendar?.currentWeek ?? world.week ?? 0;
  const month = world.calendar?.month ?? 1;
  const day = world.calendar?.currentDay ?? 1;

  const baseDedupeKey =
    params.dedupeKey ??
    `${year}|${week}|${params.type}|${params.scope ?? "world"}|${params.heyaId ?? ""}|${params.rikishiId ?? ""}|${params.title}`;

  // Include day index to scope deduplication to current tick only
  const dayIndex = world.dayIndexGlobal ?? 0;
  const versionedDedupeKey = `${baseDedupeKey}@${dayIndex}`;

  if (events.dedupe[versionedDedupeKey]) {
    return events.log[events.log.length - 1] as EngineEvent;
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
    truthLevel: params.truthLevel ?? "public",
    tags: params.tags ?? [],
  };

  events.log.push(ev);
  events.dedupe[versionedDedupeKey] = true;
  return ev;
}

/**
 * Query events.
 */
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
  const impScore = (i: EventImportance) =>
    i === "headline" ? 3 : i === "major" ? 2 : i === "notable" ? 1 : 0;
  const minImp = filters.minImportance ? impScore(filters.minImportance) : -1;

  let out = events;
  if (filters.category) out = out.filter((e) => e.category === filters.category);
  if (filters.scope) out = out.filter((e) => e.scope === filters.scope);
  if (filters.heyaId) out = out.filter((e) => e.heyaId === filters.heyaId);
  if (filters.rikishiId) out = out.filter((e) => e.rikishiId === filters.rikishiId);
  if (filters.types?.length) {
    const typesSet = new Set(filters.types);
    out = out.filter((e) => typesSet.has(e.type));
  }
  if (minImp >= 0) out = out.filter((e) => impScore(e.importance) >= minImp);

  return [...out]
    .sort((a, b) => {
      const ta = a.year * 1e6 + a.week * 100 + (a.day ?? 0);
      const tb = b.year * 1e6 + b.week * 100 + (b.day ?? 0);
      if (ta !== tb) return tb - ta;
      return stableTieBreak(b.id, a.id);
    })
    .slice(0, filters.limit ?? 50);
}

/** Flavor tick & cleanup */
export function tickWeekEvents(world: WorldState): number {
  const eventsState = ensureEventsState(world);
  if (!eventsState.log.length) return 0;

  const currentYear = world.calendar?.year ?? world.year ?? 2025;
  const currentWeek = world.calendar?.currentWeek ?? world.week ?? 0;
  const MAX_AGE_WEEKS = 52;
  const currentTotalWeeks = currentYear * 52 + currentWeek;

  let trimmedCount = 0;
  const newLog: EngineEvent[] = [];
  const prefixesToDelete = new Set<string>();

  for (const ev of eventsState.log) {
    const evTotalWeeks = ev.year * 52 + ev.week;
    const ageWeeks = currentTotalWeeks - evTotalWeeks;
    const isHeadline = ev.importance === "headline";
    const isCareerOrBasho = ev.category === "career" || ev.category === "basho";
    const isRecent = ageWeeks <= MAX_AGE_WEEKS;

    if (isRecent || isHeadline || isCareerOrBasho) {
      newLog.push(ev);
    } else {
      trimmedCount++;
      const prefix = `${ev.year}|${ev.week}|`;
      prefixesToDelete.add(prefix);
    }
  }

  if (trimmedCount > 0) {
    eventsState.log = newLog;
    if (prefixesToDelete.size > 0) {
      const prefixes = Array.from(prefixesToDelete);
      const newDedupe: Record<string, true> = {};
      for (const key in eventsState.dedupe) {
        let shouldKeep = true;
        for (let i = 0; i < prefixes.length; i++) {
          if (key.startsWith(prefixes[i])) {
            shouldKeep = false;
            break;
          }
        }
        if (shouldKeep) {
          newDedupe[key] = eventsState.dedupe[key];
        }
      }
      eventsState.dedupe = newDedupe;
    }
  }
  return trimmedCount;
}
