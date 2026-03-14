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

/**
 * Ensure events state.
 *  * @param world - The World.
 *  * @returns The result.
 */
export function ensureEventsState(world: WorldState): EventsState {
  if (world.events && world.events.version && Array.isArray(world.events.log)) return world.events;
  world.events = { version: "1.0.0", log: [], dedupe: {} };
  return world.events;
}

/** Defines the structure for log engine event params. */
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

/**
 * Log engine event.
 *  * @param world - The World.
 *  * @param params - The Params.
 *  * @returns The result.
 */
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

/**
 * Query events.
 *  * @param world - The World.
 *  * @param filters - The Filters.
 *  * @returns The result.
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

  const impScore = (i: EventImportance) => (i === "headline" ? 3 : i === "major" ? 2 : i === "notable" ? 1 : 0);
  const minImp = filters.minImportance ? impScore(filters.minImportance) : -1;

  let out = events;
  if (filters.category) out = out.filter(e => e.category === filters.category);
  if (filters.scope) out = out.filter(e => e.scope === filters.scope);
  if (filters.heyaId) out = out.filter(e => e.heyaId === filters.heyaId);
  if (filters.rikishiId) out = out.filter(e => e.rikishiId === filters.rikishiId);
  if (filters.types?.length) {
    const typesSet = new Set(filters.types);
    out = out.filter(e => typesSet.has(e.type));
  }
  if (minImp >= 0) out = out.filter(e => impScore(e.importance) >= minImp);

  // Newest-first: sort by (year, week, day) then insertion order
  return [...out].sort((a, b) => {
    const ta = a.year * 1e6 + a.week * 100 + (a.day ?? 0);
    const tb = b.year * 1e6 + b.week * 100 + (b.day ?? 0);
    if (ta !== tb) return tb - ta;
    return b.id.localeCompare(a.id);
  }).slice(0, filters.limit ?? 50);
}

/** Convenience factories — one per subsystem domain */
export const EventBus = {
  // --- Injury ---
  injury: (world: WorldState, rikishiId: Id, title: string, summary: string, data: Record<string, any>) =>
    logEngineEvent(world, {
      type: "INJURY_OCCURRED",
      category: "injury",
      importance: data?.severity === "serious" ? "headline" : data?.severity === "moderate" ? "major" : "notable",
      scope: "rikishi",
      rikishiId,
      title,
      summary,
      data,
      tags: ["injury"]
    }),

  recovery: (world: WorldState, rikishiId: Id, heyaId: Id | undefined, summary: string) =>
    logEngineEvent(world, {
      type: "INJURY_RECOVERED",
      category: "injury",
      importance: "notable",
      scope: "rikishi",
      rikishiId,
      heyaId,
      title: "Recovery complete",
      summary,
      tags: ["injury", "recovery"]
    }),

  // --- Governance ---
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
    }),

  // --- Training ---
  trainingMilestone: (world: WorldState, rikishiId: Id, heyaId: Id, title: string, summary: string, data: Record<string, any> = {}) =>
    logEngineEvent(world, {
      type: "TRAINING_MILESTONE",
      category: "training",
      importance: "notable",
      scope: "rikishi",
      rikishiId,
      heyaId,
      title,
      summary,
      data,
      tags: ["training"]
    }),

  trainingProfileChanged: (world: WorldState, heyaId: Id, summary: string) =>
    logEngineEvent(world, {
      type: "TRAINING_PROFILE_CHANGED",
      category: "training",
      importance: "minor",
      scope: "heya",
      heyaId,
      title: "Training profile updated",
      summary,
      tags: ["training"]
    }),

  // --- Economics ---
  financialAlert: (world: WorldState, heyaId: Id, title: string, summary: string, data: Record<string, any> = {}) =>
    logEngineEvent(world, {
      type: "FINANCIAL_ALERT",
      category: "economy",
      importance: data?.insolvency ? "headline" : "major",
      scope: "heya",
      heyaId,
      title,
      summary,
      data,
      tags: ["economy"]
    }),

  kenshoAwarded: (world: WorldState, rikishiId: Id, heyaId: Id, amount: number, envelopes: number) =>
    logEngineEvent(world, {
      type: "KENSHO_AWARDED",
      category: "economy",
      phase: "basho_day",
      importance: envelopes >= 5 ? "notable" : "minor",
      scope: "rikishi",
      rikishiId,
      heyaId,
      title: "Kensho prize money",
      summary: `${envelopes} envelope${envelopes === 1 ? "" : "s"} awarded (¥${amount.toLocaleString()}).`,
      data: { amount, envelopes },
      tags: ["economy", "kensho"]
    }),

  // --- Rivalries ---
  rivalryEscalated: (world: WorldState, aId: Id, bId: Id, heatBand: string, tone: string, summary: string) =>
    logEngineEvent(world, {
      type: "RIVALRY_ESCALATED",
      category: "rivalry",
      importance: heatBand === "inferno" ? "headline" : heatBand === "hot" ? "major" : "notable",
      scope: "world",
      title: `Rivalry intensifies (${heatBand})`,
      summary,
      data: { aId, bId, heatBand, tone },
      tags: ["rivalry"]
    }),

  rivalryFormed: (world: WorldState, aId: Id, bId: Id, tone: string, summary: string) =>
    logEngineEvent(world, {
      type: "RIVALRY_FORMED",
      category: "rivalry",
      importance: "notable",
      scope: "world",
      title: "New rivalry emerges",
      summary,
      data: { aId, bId, tone },
      tags: ["rivalry"]
    }),

  // --- Lifecycle ---
  retirement: (world: WorldState, rikishiId: Id, heyaId: Id, name: string, reason: string) =>
    logEngineEvent(world, {
      type: "RETIREMENT",
      category: "career",
      importance: "major",
      phase: "basho_wrap",
      scope: "rikishi",
      rikishiId,
      heyaId,
      title: `${name} retires`,
      summary: `Retirement reason: ${reason}.`,
      data: { reason },
      tags: ["lifecycle", "retirement"]
    }),

  rookieDebut: (world: WorldState, rikishiId: Id, heyaId: Id, name: string) =>
    logEngineEvent(world, {
      type: "ROOKIE_DEBUT",
      category: "career",
      importance: "notable",
      scope: "rikishi",
      rikishiId,
      heyaId,
      title: `${name} debuts`,
      summary: `A new rikishi joins the ranks.`,
      tags: ["lifecycle", "debut"]
    }),

  // --- Scouting ---
  scoutingInvestmentChanged: (world: WorldState, rikishiId: Id, level: string) =>
    logEngineEvent(world, {
      type: "SCOUTING_INVESTMENT_CHANGED",
      category: "scouting",
      importance: "minor",
      scope: "rikishi",
      rikishiId,
      title: "Scouting investment updated",
      summary: `Investment level set to ${level}.`,
      data: { level },
      tags: ["scouting"]
    }),

  // --- Basho lifecycle ---
  bashoStarted: (world: WorldState, bashoName: string) =>
    logEngineEvent(world, {
      type: "BASHO_STARTED",
      category: "basho",
      importance: "headline",
      phase: "basho_day",
      scope: "world",
      title: `${bashoName.charAt(0).toUpperCase() + bashoName.slice(1)} Basho begins`,
      summary: `The ${bashoName} tournament has officially started.`,
      data: { bashoName },
      tags: ["basho"]
    }),

  bashoEnded: (world: WorldState, bashoName: string, yushoId: Id, yushoName: string) =>
    logEngineEvent(world, {
      type: "BASHO_ENDED",
      category: "basho",
      importance: "headline",
      phase: "basho_wrap",
      scope: "world",
      title: `${bashoName.charAt(0).toUpperCase() + bashoName.slice(1)} Basho concludes`,
      summary: `${yushoName} wins the Emperor's Cup.`,
      data: { bashoName, yushoId, yushoName },
      tags: ["basho", "yusho"]
    }),

  bashoDay: (world: WorldState, day: number) =>
    logEngineEvent(world, {
      type: "BASHO_DAY_ADVANCED",
      category: "basho",
      importance: day === 15 ? "major" : day === 1 ? "notable" : "minor",
      phase: "basho_day",
      scope: "world",
      title: `Day ${day}`,
      summary: `Tournament day ${day} begins.`,
      data: { day },
      tags: ["basho"]
    }),

  // --- Welfare ---
  welfareAlert: (world: WorldState, heyaId: Id, title: string, summary: string, data: Record<string, any> = {}) =>
    logEngineEvent(world, {
      type: "WELFARE_ALERT",
      category: "welfare",
      importance: data?.complianceState === "sanctioned" ? "headline" : "major",
      scope: "heya",
      heyaId,
      title,
      summary,
      data,
      tags: ["welfare"]
    }),

  // --- Bout result (for almanac) ---
  boutResult: (world: WorldState, winnerId: Id, loserId: Id, kimarite: string, day: number) =>
    logEngineEvent(world, {
      type: "BOUT_RESULT",
      category: "basho",
      importance: "minor",
      phase: "basho_day",
      scope: "world",
      title: "Bout concluded",
      summary: `Winner decided by ${kimarite}.`,
      data: { winnerId, loserId, kimarite, day },
      tags: ["basho", "bout"]
    }),
};

/** Flavor tick & cleanup */
export function tickWeek(world: WorldState): number {
  // Keep ambient generation lightweight; other systems emit their own events.
  // This file is the bus, not a simulation system.

  const eventsState = ensureEventsState(world);
  if (!eventsState.log.length) return 0;

  const currentYear = world.calendar?.year ?? world.year ?? 2024;
  const currentWeek = world.calendar?.currentWeek ?? world.week ?? 0;

  // Define maximum age in weeks (approx 1 year = 52 weeks)
  const MAX_AGE_WEEKS = 52;

  const currentTotalWeeks = currentYear * 52 + currentWeek;

  let trimmedCount = 0;
  const newLog: EngineEvent[] = [];

  for (const ev of eventsState.log) {
    const evTotalWeeks = ev.year * 52 + ev.week;
    const ageWeeks = currentTotalWeeks - evTotalWeeks;

    // Preserve events that are relatively recent
    // or are of high importance/specific categories that we might want to keep
    const isHeadline = ev.importance === "headline";
    const isCareerOrBasho = ev.category === "career" || ev.category === "basho";
    const isRecent = ageWeeks <= MAX_AGE_WEEKS;

    if (isRecent || isHeadline || isCareerOrBasho) {
      newLog.push(ev);
    } else {
      trimmedCount++;
      // We also need to clean up the dedupe keys if possible.
      // Since dedupe keys are not explicitly stored on the event itself (except for reconstruction),
      // we do a best-effort pass over dedupe keys that match this event's basic signature,
      // or simply periodically clear out the whole dedupe map for old years.
      // A safe approach is to clear any dedupe key that contains the old year and week.
      const prefix = `${ev.year}|${ev.week}|`;
      for (const key of Object.keys(eventsState.dedupe)) {
        if (key.startsWith(prefix)) {
          delete eventsState.dedupe[key];
        }
      }
    }
  }

  if (trimmedCount > 0) {
    eventsState.log = newLog;
  }

  return trimmedCount;
}
