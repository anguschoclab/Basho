import { stableTieBreak } from "./utils/sort";
/**
 * events.ts
 * =======================================================
 * Canon Event Bus (A11)
 * - WorldState.events is the authoritative append-only log (JSON-safe).
 * - Deterministic IDs and dedupe keys prevent double-logging.
 * - Provides helper factories for common domains (injury, governance, recruitment, etc.).
 */

import { rngForWorld } from "./rng";
import type { WorldState } from "./types/world";
import type { EngineEvent, EventsState, EventCategory, EventPhase, EventImportance, EventScope, EngineEventType } from "./types/events";
export type { EngineEvent, EventsState, EventCategory, EventPhase, EventImportance, EventScope } from "./types/events";
import type { Id } from "./types/common";
import { BardEngine } from "./narrative/BardEngine";
import { rngFromSeed } from "./rng";



/**
 * Ensure events state.
 *  * @param world - The World.
 *  * @returns The result.
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

  const year = world.calendar?.year ?? world.year ?? 2025;
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

  const idRngLabel = `${dedupeKey}::${events.log.length}`;
  const rng = rngForWorld(world, "events", idRngLabel);
  const id = rng.uuid('EV');

  const ev: EngineEvent = {
    id,
    type: params.type as EngineEventType,
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
    return stableTieBreak(b.id, a.id);
  }).slice(0, filters.limit ?? 50);
}

/** Convenience factories — one per subsystem domain */
export const EventBus = {
  // --- Injury ---
  injury: (world: WorldState, rikishiId: Id, data: Record<string, any>) => {
    const importance = data?.severity === "serious" ? "headline" : data?.severity === "moderate" ? "major" : "notable";
    const intensity = BardEngine.calculateIntensity(importance === "headline" ? 3 : importance === "major" ? 2 : 1, [1, 3]);
    const seed = `injury-${rikishiId}-${world.year}-${world.week}`;
    const rng = rngFromSeed(seed, "narrative", "event");
    
    const res = BardEngine.resolve(rng, "combat.phases.injury", { ...data, intensity });

    return logEngineEvent(world, {
      type: "INJURY_OCCURRED",
      category: "injury",
      importance,
      scope: "rikishi",
      rikishiId,
      title: "Medical Report",
      summary: res.text,
      data,
      tags: ["injury"]
    });
  },

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
  governance: (world: WorldState, heyaId: Id, data: Record<string, any>, importance: EventImportance = "major") => {
    const intensity = BardEngine.calculateIntensity(importance === "headline" ? 3 : importance === "major" ? 2 : 1, [1, 3]);
    const seed = `gov-${heyaId}-${world.year}-${world.week}-${importance}`;
    const rng = rngFromSeed(seed, "narrative", "event");
    
    const titleRes = BardEngine.resolve(rng, "institutional.governance.headlines", { ...data, intensity });
    const summaryRes = BardEngine.resolve(rng, "institutional.governance.threats", { ...data, intensity });

    return logEngineEvent(world, {
      type: "GOVERNANCE_RULING",
      category: "discipline",
      importance,
      scope: "heya",
      heyaId,
      title: titleRes.text,
      summary: summaryRes.text,
      data,
      tags: ["governance"]
    });
  },

  // --- Training ---
  trainingMilestone: (world: WorldState, rikishiId: Id, heyaId: Id, data: Record<string, any> = {}) => {
    const rng = rngFromSeed(`training-milestone-${rikishiId}-${world.year}-${world.week}`, "narrative", "event");
    const title = BardEngine.resolve(rng, "events.training.breakthrough_title", data).text;
    const summary = BardEngine.resolve(rng, "events.training.milestone", data).text;

    return logEngineEvent(world, {
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
    });
  },

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
  financialAlert: (world: WorldState, heyaId: Id, data: Record<string, any> = {}) => {
    const rng = rngFromSeed(`finance-${heyaId}-${world.year}-${world.week}`, "narrative", "event");
    const title = BardEngine.resolve(rng, "events.economy.insolvency_title", data).text;
    const summary = BardEngine.resolve(rng, "events.economy.insolvency_summary", data).text;

    return logEngineEvent(world, {
      type: "FINANCIAL_ALERT",
      category: "economy",
      importance: data?.insolvency ? "headline" : "major",
      scope: "heya",
      heyaId,
      title,
      summary,
      data,
      tags: ["economy"]
    });
  },

  kenshoAwarded: (world: WorldState, rikishiId: Id, heyaId: Id, amount: number, envelopes: number) => {
    const rng = rngFromSeed(`kensho-${rikishiId}-${world.year}-${world.week}`, "narrative", "event");
    const ctx = { AMOUNT: amount.toLocaleString(), ENVELOPES: envelopes };
    const title = BardEngine.resolve(rng, "events.economy.kensho_title", ctx).text;
    const summary = BardEngine.resolve(rng, "events.economy.kensho_summary", ctx).text;

    return logEngineEvent(world, {
      type: "KENSHO_AWARDED",
      category: "economy",
      phase: "basho_day",
      importance: envelopes >= 5 ? "notable" : "minor",
      scope: "rikishi",
      rikishiId,
      heyaId,
      title,
      summary,
      data: { amount, envelopes },
      tags: ["economy", "kensho"]
    });
  },

  specialPrizesAwarded: (world: WorldState, rikishiId: Id, heyaId: Id, prizeType: 'Shukun' | 'Kanto' | 'Gino', amount: number) => {
    const rng = rngFromSeed(`prize-${rikishiId}-${world.year}-${world.week}-${prizeType}`, "narrative", "event");
    const ctx = { PRIZETYPE: prizeType, AMOUNT: amount.toLocaleString() };
    const title = BardEngine.resolve(rng, "events.economy.special_prize_title", ctx).text;
    const summary = BardEngine.resolve(rng, "events.economy.special_prize_summary", ctx).text;

    return logEngineEvent(world, {
      type: "SPECIAL_PRIZES_AWARDED",
      category: "basho",
      importance: "headline",
      phase: "basho_wrap",
      scope: "rikishi",
      rikishiId,
      heyaId,
      title,
      summary,
      data: { rikishiId, heyaId, prizeType, amount },
      tags: ["basho", "award", "economy"]
    });
  },

  // --- Rivalries ---
  rivalryEscalated: (world: WorldState, aId: Id, bId: Id, aName: string, bName: string, heatBand: string, tone: string) => {
    const rng = rngFromSeed(`rivalry-esc-${aId}-${bId}-${world.year}-${world.week}`, "narrative", "event");
    const ctx = { A_NAME: aName, B_NAME: bName, HEAT: heatBand };
    const title = BardEngine.resolve(rng, "events.rivalry.escalated_title", ctx).text;
    const summary = BardEngine.resolve(rng, "events.rivalry.escalated_summary", ctx).text;

    return logEngineEvent(world, {
      type: "RIVALRY_ESCALATED",
      category: "rivalry",
      importance: heatBand === "inferno" ? "headline" : heatBand === "hot" ? "major" : "notable",
      scope: "world",
      title,
      summary,
      data: { aId, bId, heatBand, tone },
      tags: ["rivalry"]
    });
  },

  rivalryFormed: (world: WorldState, aId: Id, bId: Id, aName: string, bName: string, tone: string) => {
    const rng = rngFromSeed(`rivalry-form-${aId}-${bId}-${world.year}-${world.week}`, "narrative", "event");
    const ctx = { A_NAME: aName, B_NAME: bName };
    const title = BardEngine.resolve(rng, "events.rivalry.formed_title", ctx).text;
    const summary = BardEngine.resolve(rng, "events.rivalry.formed_summary", ctx).text;

    return logEngineEvent(world, {
      type: "RIVALRY_FORMED",
      category: "rivalry",
      importance: "notable",
      scope: "world",
      title,
      summary,
      data: { aId, bId, tone },
      tags: ["rivalry"]
    });
  },

  // --- Lifecycle ---
  retirement: (world: WorldState, rikishiId: Id, heyaId: Id, name: string, reason: string) => {
    const rng = rngFromSeed(`retirement-${rikishiId}-${world.year}-${world.week}`, "narrative", "event");
    const summary = BardEngine.resolve(rng, "events.lifecycle.retirement", { name, reason }).text;
    return logEngineEvent(world, {
      type: "RETIREMENT",
      category: "career",
      importance: "major",
      phase: "basho_wrap",
      scope: "rikishi",
      rikishiId,
      heyaId,
      title: `${name} retires`,
      summary,
      data: { reason },
      tags: ["lifecycle", "retirement"]
    });
  },

  rookieDebut: (world: WorldState, rikishiId: Id, heyaId: Id, name: string) => {
    const rng = rngFromSeed(`debut-${rikishiId}-${world.year}-${world.week}`, "narrative", "event");
    const summary = BardEngine.resolve(rng, "events.lifecycle.debut", { name }).text;
    return logEngineEvent(world, {
      type: "ROOKIE_DEBUT",
      category: "career",
      importance: "notable",
      scope: "rikishi",
      rikishiId,
      heyaId,
      title: `${name} debuts`,
      summary,
      tags: ["lifecycle", "debut"]
    });
  },

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
  bashoStarted: (world: WorldState, bashoName: string) => {
    const rng = rngFromSeed(`basho-start-${bashoName}-${world.year}`, "narrative", "event");
    const summary = BardEngine.resolve(rng, "events.basho.started", { bashoname: bashoName }).text;
    return logEngineEvent(world, {
      type: "BASHO_STARTED",
      category: "basho",
      importance: "headline",
      phase: "basho_day",
      scope: "world",
      title: `${bashoName.charAt(0).toUpperCase() + bashoName.slice(1)} Basho begins`,
      summary,
      data: { bashoName },
      tags: ["basho"]
    });
  },

  bashoEnded: (world: WorldState, bashoName: string, yushoId: Id, yushoName: string) => {
    const rng = rngFromSeed(`basho-end-${bashoName}-${world.year}`, "narrative", "event");
    const summary = BardEngine.resolve(rng, "events.basho.ended", { bashoname: bashoName, yushoname: yushoName }).text;
    return logEngineEvent(world, {
      type: "BASHO_ENDED",
      category: "basho",
      importance: "headline",
      phase: "basho_wrap",
      scope: "world",
      title: `${bashoName.charAt(0).toUpperCase() + bashoName.slice(1)} Basho concludes`,
      summary,
      data: { bashoName, yushoId, yushoName },
      tags: ["basho", "yusho"]
    });
  },

  bashoDay: (world: WorldState, day: number) => {
    const rng = rngFromSeed(`basho-day-${day}-${world.year}`, "narrative", "event");
    const ctx = { DAY: day };
    const title = BardEngine.resolve(rng, "events.basho.day_title", ctx).text;
    const summary = BardEngine.resolve(rng, "events.basho.day_summary", ctx).text;

    return logEngineEvent(world, {
      type: "BASHO_DAY_ADVANCED",
      category: "basho",
      importance: day === 15 ? "major" : day === 1 ? "notable" : "minor",
      phase: "basho_day",
      scope: "world",
      title,
      summary,
      data: { day },
      tags: ["basho"]
    });
  },

  // --- Welfare ---
  welfareAlert: (world: WorldState, heyaId: Id, data: Record<string, any> = {}) => {
    const rng = rngFromSeed(`welfare-${heyaId}-${world.year}-${world.week}`, "narrative", "event");
    const ctx = { HEYANAME: data.heyaName, STATUS: data.complianceState };
    const title = BardEngine.resolve(rng, "events.welfare.alert_title", ctx).text;
    const summary = BardEngine.resolve(rng, "events.welfare.alert_summary", ctx).text;

    return logEngineEvent(world, {
      type: "WELFARE_ALERT",
      category: "welfare",
      importance: data?.complianceState === "sanctioned" ? "headline" : "major",
      scope: "heya",
      heyaId,
      title,
      summary,
      data,
      tags: ["welfare"]
    });
  },

  welfareRiskShift: (world: WorldState, heyaId: Id, data: { heyaname: string, welfareRisk: number, delta: number, reasons: string }) => {
    const rng = rngFromSeed(`welfare-risk-${heyaId}-${world.year}-${world.week}`, "narrative", "event");
    const title = "Welfare Risk Shift";
    const summary = BardEngine.resolve(rng, "institutional.welfare.risk_update", data).text;

    return logEngineEvent(world, {
      type: "WELFARE_RISK_UPDATE",
      category: "discipline",
      importance: data.welfareRisk >= 70 ? "major" : "notable",
      scope: "heya",
      heyaId,
      title,
      summary,
      data,
      tags: ["welfare", "discipline"]
    });
  },

  complianceWatch: (world: WorldState, heyaId: Id, data: { heyaname: string, hasNegligence: boolean, reasons: string }) => {
    const rng = rngFromSeed(`welfare-watch-${heyaId}-${world.year}-${world.week}`, "narrative", "event");
    const watchPath = data.hasNegligence ? "institutional.welfare.watch_negligence" : "institutional.welfare.watch_started";
    const title = data.hasNegligence ? "Compliance Watch — Negligence Suspected" : "Compliance Watch";
    const summary = BardEngine.resolve(rng, watchPath, data).text;

    return logEngineEvent(world, {
      type: "COMPLIANCE_WATCH",
      category: "discipline",
      importance: "notable",
      scope: "heya",
      heyaId,
      title,
      summary,
      data,
      tags: ["welfare", "discipline"]
    });
  },

  complianceInvestigation: (world: WorldState, heyaId: Id, type: 'opened' | 'closed', data: { heyaname: string, welfareRisk: number }) => {
    const rng = rngFromSeed(`welfare-inv-${type}-${heyaId}-${world.year}-${world.week}`, "narrative", "event");
    const path = type === 'opened' ? "institutional.welfare.investigation_opened" : "institutional.welfare.investigation_closed";
    const title = type === 'opened' ? "Investigation Opened" : "Investigation Closed";
    const summary = BardEngine.resolve(rng, path, data).text;

    return logEngineEvent(world, {
      type: type === 'opened' ? "COMPLIANCE_INVESTIGATION_OPENED" : "COMPLIANCE_INVESTIGATION_CLOSED",
      category: "discipline",
      importance: type === 'opened' ? (data.welfareRisk >= 80 ? "headline" : "major") : "major",
      scope: "heya",
      heyaId,
      title,
      summary,
      data,
      tags: ["welfare", "discipline"]
    });
  },

  complianceSanctioned: (world: WorldState, heyaId: Id, data: { heyaname: string, welfareRisk: number, fineYen: number, newFunds: number }) => {
    const rng = rngFromSeed(`welfare-sanction-${heyaId}-${world.year}-${world.week}`, "narrative", "event");
    const title = "Sanctions Issued";
    const summary = BardEngine.resolve(rng, "institutional.welfare.sanctioned", data).text;

    return logEngineEvent(world, {
      type: "COMPLIANCE_SANCTIONED",
      category: "discipline",
      importance: "headline",
      scope: "heya",
      heyaId,
      title,
      summary,
      data,
      tags: ["welfare", "discipline"]
    });
  },

  complianceCleared: (world: WorldState, heyaId: Id, data: { heyaname: string, welfareRisk: number }) => {
    const rng = rngFromSeed(`welfare-cleared-${heyaId}-${world.year}-${world.week}`, "narrative", "event");
    const title = "Watch Lifted";
    const summary = BardEngine.resolve(rng, "institutional.welfare.cleared", data).text;

    return logEngineEvent(world, {
      type: "COMPLIANCE_CLEARED",
      category: "discipline",
      importance: "minor",
      scope: "heya",
      heyaId,
      title,
      summary,
      data,
      tags: ["welfare", "discipline"]
    });
  },

  complianceSanctionsLifted: (world: WorldState, heyaId: Id, data: { heyaname: string, welfareRisk: number }) => {
    const rng = rngFromSeed(`welfare-lift-${heyaId}-${world.year}-${world.week}`, "narrative", "event");
    const title = "Sanctions Lifted";
    const summary = BardEngine.resolve(rng, "institutional.welfare.sanctions_lifted", data).text;

    return logEngineEvent(world, {
      type: "COMPLIANCE_SANCTIONS_LIFTED",
      category: "discipline",
      importance: "major",
      scope: "heya",
      heyaId,
      title,
      summary,
      data,
      tags: ["welfare", "discipline"]
    });
  },

  dietChanged: (world: WorldState, heyaId: Id, data: { heyaname: string, oldDiet: string, newDiet: string }) => {
    const title = `${data.heyaname} changed diet to ${data.newDiet}`;
    const summary = `${data.heyaname} is now using the ${data.newDiet} regimen.`;

    return logEngineEvent(world, {
      type: "DIET_CHANGED",
      category: "facility",
      importance: "minor",
      scope: "heya",
      heyaId,
      title,
      summary,
      data,
      tags: ["facility", "welfare"]
    });
  },

  // --- Bout result (for almanac) ---
  boutResult: (world: WorldState, winnerId: Id, loserId: Id, kimarite: string, day: number) => {
    const rng = rngFromSeed(`bout-result-${winnerId}-${loserId}-${world.year}-${world.week}-${day}`, "narrative", "event");
    const ctx = { KIMARITE: kimarite };
    const title = BardEngine.resolve(rng, "events.basho.bout_title", ctx).text;
    const summary = BardEngine.resolve(rng, "events.basho.bout_summary", ctx).text;

    return logEngineEvent(world, {
      type: "BOUT_RESULT",
      category: "basho",
      importance: "minor",
      phase: "basho_day",
      scope: "world",
      title,
      summary,
      data: { winnerId, loserId, kimarite, day },
      tags: ["basho", "bout"]
    });
  },
};

/** Flavor tick & cleanup */
export function tickWeekEvents(world: WorldState): number {

  // Keep ambient generation lightweight; other systems emit their own events.
  // This file is the bus, not a simulation system.

  const eventsState = ensureEventsState(world);
  if (!eventsState.log.length) return 0;

  const currentYear = world.calendar?.year ?? world.year ?? 2025;
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
      for (const key in eventsState.dedupe) {
        if (key.startsWith(prefix)) {
          delete eventsState.dedupe[key];
        }
      }
    }
  }

  if (trimmedCount > 0) {
    eventsState.log = newLog;

    // Process dedupe keys in a single pass over the map
  }

  return trimmedCount;
}
