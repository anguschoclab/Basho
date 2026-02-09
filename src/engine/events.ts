/**
 * events.ts
 * =======================================================
 * Canon Event Bus (A11)
 * - WorldState.events is the authoritative append-only log (JSON-safe).
 * - Deterministic IDs and dedupe keys prevent double-logging.
 * - Provides helper factories for common domains (injury, governance, recruitment, etc.).
 */

import type {
  WorldState,
  EngineEvent,
  EventsState,
  EventCategory,
  EventPhase,
  EventImportance,
  EventScope,
  Id
} from "./types";

/** Stable hash for deterministic IDs (FNV-1a-like) */
function stableHash(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

export function ensureEventsState(world: WorldState): EventsState {
  if (world.events && world.events.version && Array.isArray(world.events.log)) return world.events;
  world.events = { version: "1.0.0", log: [], dedupe: {} };
  return world.events;
}

export interface LogEngineEventParams {
  type: string;
  category: EventCategory;
  phase?: EventPhase;
  importance?: EventImportance;
  scope?: EventScope;
  heyaId?: Id;
  rikishiId?: Id;
  title: string;
  summary: string;
  data?: Record<string, string | number | boolean | null | undefined>;
  truthLevel?: "public" | "limited" | "private";
  tags?: string[];
  causalEventId?: Id;
  /** Optional explicit dedupe key */
  dedupeKey?: string;
}

export function logEngineEvent(world: WorldState, params: LogEngineEventParams): EngineEvent {
  const events = ensureEventsState(world);

  const year = world.calendar?.year ?? world.year ?? 2024;
  const week = world.calendar?.currentWeek ?? world.week ?? 0;
  const month = world.calendar?.month ?? 1;
  const day = world.calendar?.currentDay ?? 1;

  const dedupeKey =
    params.dedupeKey ??
    `${year}|${week}|${params.type}|${params.scope ?? "world"}|${params.heyaId ?? ""}|${params.rikishiId ?? ""}|${params.title}`;

  if (events.dedupe[dedupeKey]) {
    // Return a synthetic handle to keep call sites simple
    return events.log[events.log.length - 1] as EngineEvent;
  }

  const idSeed = `${world.seed ?? "seed"}::${dedupeKey}::${events.log.length}`;
  const id = `evt-${stableHash(idSeed)}`;

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
    data: params.data ?? {},
    truthLevel: params.truthLevel ?? "public",
    tags: params.tags ?? []
  };

  events.log.push(ev);
  events.dedupe[dedupeKey] = true;
  return ev;
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

  const impScore = (i: EventImportance) => (i === "headline" ? 3 : i === "major" ? 2 : i === "notable" ? 1 : 0);
  const minImp = filters.minImportance ? impScore(filters.minImportance) : -1;

  let out = events;
  if (filters.category) out = out.filter(e => e.category === filters.category);
  if (filters.scope) out = out.filter(e => e.scope === filters.scope);
  if (filters.heyaId) out = out.filter(e => e.heyaId === filters.heyaId);
  if (filters.rikishiId) out = out.filter(e => e.rikishiId === filters.rikishiId);
  if (filters.types?.length) out = out.filter(e => filters.types!.includes(e.type));
  if (minImp >= 0) out = out.filter(e => impScore(e.importance) >= minImp);

  // Newest-first: sort by (year, week, day) then insertion order
  return [...out].sort((a, b) => {
    const ta = a.year * 1e6 + a.week * 100 + (a.day ?? 0);
    const tb = b.year * 1e6 + b.week * 100 + (b.day ?? 0);
    if (ta !== tb) return tb - ta;
    return b.id.localeCompare(a.id);
  }).slice(0, filters.limit ?? 50);
}

/** Convenience factories */
export const EventBus = {
  injury: (world: WorldState, rikishiId: Id, title: string, summary: string, data: Record<string, any>) =>
    logEngineEvent(world, {
      type: "INJURY",
      category: "injury",
      importance: data?.severity === "serious" ? "headline" : data?.severity === "moderate" ? "major" : "notable",
      scope: "rikishi",
      rikishiId,
      title,
      summary,
      data,
      tags: ["injury"]
    }),

  governance: (world: WorldState, heyaId: Id, title: string, summary: string, data: Record<string, any>, importance: EventImportance = "major") =>
    logEngineEvent(world, {
      type: "GOVERNANCE_RULING",
      category: "discipline",
      importance,
      scope: "heya",
      heyaId,
      title,
      summary,
      data,
      tags: ["governance"]
    })
};

/** Flavor tick */
export function tickWeek(world: WorldState): number {
  // Keep ambient generation lightweight; other systems emit their own events.
  // This file is the bus, not a simulation system.
  return 0;
}
