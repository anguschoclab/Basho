import { stableTieBreak } from "./utils/sort";
/**
 * events.ts
 * =======================================================
 * Canon Event Bus (A11) - Bard Engine v2.2 (Exhaustive)
 * - WorldState.events is the authoritative append-only log (JSON-safe).
 * - Deterministic IDs and dedupe keys prevent double-logging.
 * - Provides helper factories for canonical simulation domains.
 */

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
  type NarrativeContext
} from "./types/events";
export type { EngineEvent, EventsState, EventCategory, EventPhase, EventImportance, EventScope } from "./types/events";
import type { Id } from "./types/common";
import { BardEngine } from "./narrative/BardEngine";
import { rngFromSeed } from "./rng";

/**
 * Ensure events state.
 */
export function ensureEventsState(world: WorldState): EventsState {
  if (world.events && world.events.version && Array.isArray(world.events.log)) {
    if (!world.events.dedupe) world.events.dedupe = {};
    return world.events as EventsState;
  }
  world.events = { version: "1.0.0", log: [], dedupe: {} };
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
 * Log engine event.
 */
export function logEngineEvent(world: WorldState, params: LogEngineEventParams): EngineEvent {
  const events = ensureEventsState(world);

  const year = world.calendar?.year ?? world.year ?? 2025;
  const week = world.calendar?.currentWeek ?? world.week ?? 0;
  const month = world.calendar?.month ?? 1;
  const day = world.calendar?.currentDay ?? 1;

  const dedupeKey =
    params.dedupeKey ??
    `${year}|${week}|${params.type}|${params.scope ?? "world"}|${params.heyaId ?? ""}|${params.rikishiId ?? ""}|${params.title}`;

  if (events.dedupe[dedupeKey]) {
    return events.log[events.log.length - 1] as EngineEvent;
  }

  const idRngLabel = `${dedupeKey}::${events.log.length}`;
  const rng = rngForWorld(world, "events", idRngLabel);
  const id = rng.uuid('EV');

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
    tags: params.tags ?? []
  };

  events.log.push(ev);
  events.dedupe[dedupeKey] = true;
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

  return [...out].sort((a, b) => {
    const ta = a.year * 1e6 + a.week * 100 + (a.day ?? 0);
    const tb = b.year * 1e6 + b.week * 100 + (b.day ?? 0);
    if (ta !== tb) return tb - ta;
    return stableTieBreak(b.id, a.id);
  }).slice(0, filters.limit ?? 50);
}

/** 
 * EventBus v2.2 - Pure Canonical Factories 
 * All legacy ad-hoc string formatting is removed.
 * All factories use BardEngine.resolve for both title and summary.
 */
export const EventBus = {
  
  medicalReportBase: (world: WorldState, ctx: NarrativeContext, importance: EventImportance) => {
    const rng = rngFromSeed(`medical-${ctx.rikishiId}-${world.year}-${world.week}-${ctx.status}`, "narrative", "event");
    const titleRes = BardEngine.resolve(rng, "events.medical.title", ctx);
    const summaryRes = BardEngine.resolve(rng, "events.medical.summary", ctx);

    return logEngineEvent(world, {
      type: "MEDICAL_REPORT",
      category: "injury",
      importance,
      scope: "rikishi",
      rikishiId: ctx.rikishiId as any,
      heyaId: ctx.heyaId as any,
      title: titleRes.text,
      summary: summaryRes.text,
      data: ctx,
      tags: ["medical", ctx.status as string]
    });
  },

  governanceRuling: (world: WorldState, heyaId: Id, ctx: NarrativeContext, importance: EventImportance = "major") => {
    const heya = world.heyas.get(heyaId);
    const enrichedCtx: NarrativeContext = { heya: heya?.name, heyaname: heya?.name, ...ctx };
    const rng = rngFromSeed(`gov-${heyaId}-${world.year}-${world.week}-${ctx.incident}`, "narrative", "event");
    const titleRes = BardEngine.resolve(rng, "events.governance.title", enrichedCtx);
    const summaryRes = BardEngine.resolve(rng, "events.governance.summary", enrichedCtx);

    return logEngineEvent(world, {
      type: "GOVERNANCE_RULING",
      category: "discipline",
      importance,
      scope: "heya",
      heyaId,
      title: titleRes.text,
      summary: summaryRes.text,
      data: enrichedCtx,
      tags: ["governance", "discipline"]
    });
  },

  trainingUpdate: (world: WorldState, ctx: NarrativeContext) => {
    const rng = rngFromSeed(`training-${ctx.rikishiId}-${world.year}-${world.week}`, "narrative", "event");
    const titleRes = BardEngine.resolve(rng, "events.training.title", ctx);
    const summaryRes = BardEngine.resolve(rng, "events.training.summary", ctx);

    return logEngineEvent(world, {
      type: "TRAINING_UPDATE",
      category: "training",
      importance: "notable",
      scope: ctx.rikishiId ? "rikishi" : "heya",
      rikishiId: ctx.rikishiId as any,
      heyaId: ctx.heyaId as any,
      title: titleRes.text,
      summary: summaryRes.text,
      data: ctx,
      tags: ["training"]
    });
  },

  financialAlert: (world: WorldState, heyaId: Id, ctx: NarrativeContext) => {
    const rng = rngFromSeed(`finance-${heyaId}-${world.year}-${world.week}-${ctx.incident}`, "narrative", "event");
    const titleRes = BardEngine.resolve(rng, "events.economy.title", ctx);
    const summaryRes = BardEngine.resolve(rng, "events.economy.summary", ctx);

    return logEngineEvent(world, {
      type: "FINANCIAL_ALERT",
      category: "economy",
      importance: ctx.incident === "insolvency" ? "headline" : "major",
      scope: "heya",
      heyaId,
      title: titleRes.text,
      summary: summaryRes.text,
      data: ctx,
      tags: ["economy", ctx.incident as string]
    });
  },

  awardConferred: (world: WorldState, ctx: NarrativeContext) => {
    const rng = rngFromSeed(`award-${ctx.rikishiId}-${world.year}-${world.week}-${ctx.status}`, "narrative", "event");
    const titleRes = BardEngine.resolve(rng, "events.awards.title", ctx);
    const summaryRes = BardEngine.resolve(rng, "events.awards.summary", ctx);

    return logEngineEvent(world, {
      type: "AWARD_CONFERRED",
      category: "basho",
      importance: "headline",
      phase: "basho_wrap",
      scope: "rikishi",
      rikishiId: ctx.rikishiId as any,
      heyaId: ctx.heyaId as any,
      title: titleRes.text,
      summary: summaryRes.text,
      data: ctx,
      tags: ["basho", "award"]
    });
  },

  lifecycleEvent: (world: WorldState, ctx: NarrativeContext) => {
    const rng = rngFromSeed(`lifecycle-${ctx.rikishiId}-${world.year}-${world.week}-${ctx.status}`, "narrative", "event");
    const titleRes = BardEngine.resolve(rng, "events.lifecycle.title", ctx);
    const summaryRes = BardEngine.resolve(rng, "events.lifecycle.summary", ctx);

    return logEngineEvent(world, {
      type: "LIFECYCLE_EVENT",
      category: "career",
      importance: ctx.status === "retirement" ? "major" : "notable",
      scope: "rikishi",
      rikishiId: ctx.rikishiId as any,
      heyaId: ctx.heyaId as any,
      title: titleRes.text,
      summary: summaryRes.text,
      data: ctx,
      tags: ["career", ctx.status as string]
    });
  },

  bashoStatus: (world: WorldState, ctx: NarrativeContext) => {
    const rng = rngFromSeed(`basho-status-${ctx.status}-${world.year}-${ctx.day}`, "narrative", "event");
    const titleRes = BardEngine.resolve(rng, "events.basho.status_title", ctx);
    const summaryRes = BardEngine.resolve(rng, "events.basho.status_summary", ctx);

    return logEngineEvent(world, {
      type: "BASHO_STATUS",
      category: "basho",
      importance: ctx.status === "started" || ctx.status === "ended" || ctx.day === 15 ? "headline" : "notable",
      phase: "basho_day",
      scope: "world",
      title: titleRes.text,
      summary: summaryRes.text,
      data: ctx,
      tags: ["basho", ctx.status as string]
    });
  },

  welfareCompliance: (world: WorldState, heyaId: Id, ctx: NarrativeContext) => {
    const rng = rngFromSeed(`welfare-${heyaId}-${world.year}-${world.week}-${ctx.status}`, "narrative", "event");
    const titleRes = BardEngine.resolve(rng, "events.welfare.title", ctx);
    const summaryRes = BardEngine.resolve(rng, "events.welfare.summary", ctx);

    return logEngineEvent(world, {
      type: "WELFARE_COMPLIANCE",
      category: "welfare",
      importance: ctx.status === "sanctioned" ? "headline" : "major",
      scope: "heya",
      heyaId,
      title: titleRes.text,
      summary: summaryRes.text,
      data: ctx,
      tags: ["welfare", ctx.status as string]
    });
  },

  // --- Core Simulation Hooks ---

  boutResolved: (world: WorldState, data: NarrativeContext) => {
    const rng = rngFromSeed(`bout-resolved-${data.winnerRikishiId}-${data.loserRikishiId}-${world.year}-${world.week}-${data.day}`, "narrative", "event");
    const titleRes = BardEngine.resolve(rng, "events.basho.bout_title", data);
    const summaryRes = BardEngine.resolve(rng, "events.basho.bout_summary", data);

    return logEngineEvent(world, {
      type: "BOUT_RESOLVED",
      category: "basho",
      importance: data.upset || data.isKinboshi ? "headline" : "notable",
      phase: "basho_day",
      scope: "world",
      title: titleRes.text,
      summary: summaryRes.text,
      data,
      tags: ["basho", "bout", "pbp"]
    });
  },

  recruitDiscovered: (world: WorldState, data: NarrativeContext) => {
    const rng = rngFromSeed(`recruit-${data.rikishiId}-${world.year}-${world.week}`, "narrative", "event");
    const res = BardEngine.resolve(rng, "events.recruiting.scouting_reports", data);
    const titleRes = BardEngine.resolve(rng, "events.recruiting.title", data);

    return logEngineEvent(world, {
      type: "RECRUIT_DISCOVERED",
      category: "scouting",
      importance: "notable",
      scope: "world",
      rikishiId: data.rikishiId as any,
      title: titleRes.text,
      summary: res.text,
      data,
      tags: ["scouting", "recruitment"]
    });
  },

  monthlyFinanceReport: (world: WorldState, data: NarrativeContext) => {
    const rng = rngFromSeed(`finance-tick-${data.heya}-${world.year}-${world.week}`, "narrative", "event");
    const res = BardEngine.resolve(rng, "events.economy.market_shifts", data);
    const titleRes = BardEngine.resolve(rng, "events.economy.title", data);

    return logEngineEvent(world, {
      type: "MONTHLY_FINANCE_REPORT",
      category: "economy",
      phase: "monthly",
      importance: "notable",
      scope: "heya",
      heyaId: data.heyaId as any,
      title: titleRes.text,
      summary: res.text,
      data,
      tags: ["economy", "finance"]
    });
  },

  rivalryHeatSpike: (world: WorldState, data: NarrativeContext) => {
    const rng = rngFromSeed(`rivalry-heat-${data.winner}-${data.loser}-${world.year}-${world.week}`, "narrative", "event");
    const res = BardEngine.resolve(rng, "events.rivalry.press_rumors", data);
    const titleRes = BardEngine.resolve(rng, "events.rivalry.title", data);

    return logEngineEvent(world, {
      type: "RIVALRY_HEAT_SPIKE",
      category: "rivalry",
      importance: (data.heat as number) > 75 ? "major" : "notable",
      scope: "world",
      title: titleRes.text,
      summary: res.text,
      data,
      tags: ["rivalry", "hype"]
    });
  },

  oyakataMoodShift: (world: WorldState, heyaId: Id, data: NarrativeContext) => {
    const rng = rngFromSeed(`mood-${heyaId}-${world.year}-${world.week}`, "narrative", "event");
    const titleRes = BardEngine.resolve(rng, "events.narrative.mood_shift_title", data);
    const summaryRes = BardEngine.resolve(rng, "events.narrative.mood_shift_summary", data);

    return logEngineEvent(world, {
      type: "OYAKATA_MOOD_SHIFT",
      category: "narrative",
      importance: "major",
      scope: "heya",
      heyaId,
      title: titleRes.text,
      summary: summaryRes.text,
      data,
      tags: ["narrative", "mood"]
    });
  },

  managementDecision: (world: WorldState, heyaId: Id, data: NarrativeContext, importance: EventImportance = "minor") => {
    const rng = rngFromSeed(`mgmt-${heyaId}-${world.year}-${world.week}`, "narrative", "event");
    const titleRes = BardEngine.resolve(rng, "events.management.decision_title", data);
    const summaryRes = BardEngine.resolve(rng, "events.management.decision_summary", data);

    return logEngineEvent(world, {
      type: "NPC_MANAGER_DECISION",
      category: "training",
      importance,
      scope: "heya",
      heyaId,
      title: titleRes.text,
      summary: summaryRes.text,
      data,
      tags: ["management", "strategy"]
    });
  },

  strategyShift: (world: WorldState, heyaId: Id, data: NarrativeContext) => {
    const rng = rngFromSeed(`strategy-${heyaId}-${world.year}-${world.week}`, "narrative", "event");
    const titleRes = BardEngine.resolve(rng, "events.narrative.strategy_shift_title", data);
    const summaryRes = BardEngine.resolve(rng, "events.narrative.strategy_shift_summary", data);

    return logEngineEvent(world, {
      type: "NARRATIVE_STRATEGY_SHIFT",
      category: "narrative",
      importance: "major",
      scope: "world",
      heyaId,
      title: titleRes.text,
      summary: summaryRes.text,
      data,
      tags: ["narrative", "strategy"]
    });
  },

  facilityUpdate: (world: WorldState, heyaId: Id, data: NarrativeContext, type: "UPGRADED" | "DEGRADED") => {
    const rng = rngFromSeed(`facility-${heyaId}-${world.year}-${world.week}-${type}`, "narrative", "event");
    const path = type === "UPGRADED" ? "events.facility.upgraded" : "events.facility.degraded";
    const titleRes = BardEngine.resolve(rng, `${path}_title`, data);
    const summaryRes = BardEngine.resolve(rng, `${path}_summary`, data);

    return logEngineEvent(world, {
      type: type === "UPGRADED" ? "FACILITY_UPGRADED" : "FACILITY_DEGRADED",
      category: "facility",
      importance: "notable",
      scope: "heya",
      heyaId,
      title: titleRes.text,
      summary: summaryRes.text,
      data,
      tags: ["facility", type.toLowerCase()]
    });
  },

  rosterEvent: (world: WorldState, heyaId: Id, data: NarrativeContext) => {
    const rng = rngFromSeed(`roster-${heyaId}-${data.rikishiId}-${world.year}`, "narrative", "event");
    const titleRes = BardEngine.resolve(rng, "events.management.roster_overflow_title", data);
    const summaryRes = BardEngine.resolve(rng, "events.management.roster_overflow_summary", data);

    return logEngineEvent(world, {
      type: "ROSTER_OVERFLOW_RELEASE",
      category: "career",
      importance: "major",
      scope: "heya",
      heyaId,
      rikishiId: data.rikishiId as Id,
      title: titleRes.text,
      summary: summaryRes.text,
      data,
      tags: ["roster", "release"]
    });
  },

  prestigeEvent: (world: WorldState, heyaId: Id, data: NarrativeContext) => {
    const rng = rngFromSeed(`prestige-${heyaId}-${world.year}-${world.week}`, "narrative", "event");
    const titleRes = BardEngine.resolve(rng, "events.narrative.prestige_title", data);
    const summaryRes = BardEngine.resolve(rng, "events.narrative.prestige_summary", data);

    return logEngineEvent(world, {
      type: "AWARD_CONFERRED", // Reuse or map to generic milestone
      category: "milestone",
      importance: "notable",
      scope: "heya",
      heyaId,
      title: titleRes.text,
      summary: summaryRes.text,
      data,
      tags: ["prestige", "milestone"]
    });
  },

  lifecycleAction: (world: WorldState, data: NarrativeContext, type: "naturalization" | "merger") => {
    const rng = rngFromSeed(`lifecycle-${type}-${data.rikishiId || data.heyaId}-${world.year}`, "narrative", "event");
    const titleRes = BardEngine.resolve(rng, `events.lifecycle.${type}_title`, data);
    const summaryRes = BardEngine.resolve(rng, `events.lifecycle.${type}_summary`, data);

    return logEngineEvent(world, {
      type: "LIFECYCLE_EVENT",
      category: "career",
      importance: "major",
      scope: data.rikishiId ? "rikishi" : "heya",
      rikishiId: data.rikishiId as any,
      heyaId: data.heyaId as any,
      title: titleRes.text,
      summary: summaryRes.text,
      data,
      tags: ["lifecycle", type]
    });
  },

  financialAction: (world: WorldState, heyaId: Id, data: NarrativeContext, type: "loan" | "market") => {
    const rng = rngFromSeed(`finance-${type}-${heyaId}-${world.year}-${world.week}`, "narrative", "event");
    const titleRes = BardEngine.resolve(rng, `events.economy.${type}_title`, data);
    const summaryRes = BardEngine.resolve(rng, `events.economy.${type}_summary`, data);

    return logEngineEvent(world, {
      type: "FINANCIAL_ALERT",
      category: "economy",
      importance: "notable",
      scope: "heya",
      heyaId,
      title: titleRes.text,
      summary: summaryRes.text,
      data,
      tags: ["economy", type]
    });
  },
};

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
      for (const key in eventsState.dedupe) {
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
