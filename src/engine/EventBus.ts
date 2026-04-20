/**
 * EventBus.ts
 * ===========
 * Canonical BardEngine event factories for every simulation domain.
 * All methods delegate to logEngineEvent with the appropriate type/category/tags.
 */

import type { WorldState } from "./types/world";
import type { EventImportance, NarrativeContext } from "./types/events";
import type { Id } from "./types/common";
import { BardEngine } from "./narrative/BardEngine";
import { rngFromSeed } from "./rng";
import { createRngForEvent } from "./eventHelpers";
import { logEngineEvent } from "./events";

export const EventBus = {
  medicalReportBase: (world: WorldState, ctx: NarrativeContext, importance: EventImportance) => {
    const rng = createRngForEvent(world, `medical-${ctx.rikishiId}-${ctx.status}`);
    const titleRes = BardEngine.resolve(rng, "events.medical.title", ctx);
    const summaryRes = BardEngine.resolve(rng, "events.medical.summary", ctx);

    return logEngineEvent(world, {
      type: "MEDICAL_REPORT",
      category: "injury",
      importance,
      scope: "rikishi",
      rikishiId: ctx.rikishiId,
      heyaId: ctx.heyaId,
      title: titleRes.text,
      summary: summaryRes.text,
      data: ctx,
      tags: ["medical", ctx.status as string],
    });
  },

  governanceRuling: (
    world: WorldState,
    heyaId: Id,
    ctx: NarrativeContext,
    importance: EventImportance = "major"
  ) => {
    const heya = world.heyas.get(heyaId);
    const enrichedCtx: NarrativeContext = { heya: heya?.name, heyaname: heya?.name, ...ctx };
    const rng = createRngForEvent(world, `gov-${heyaId}-${ctx.incident}`);
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
      tags: ["governance", "discipline"],
    });
  },

  trainingUpdate: (world: WorldState, ctx: NarrativeContext) => {
    const rng = createRngForEvent(world, `training-${ctx.rikishiId}`);
    const titleRes = BardEngine.resolve(rng, "events.training.title", ctx);
    const summaryRes = BardEngine.resolve(rng, "events.training.summary", ctx);

    return logEngineEvent(world, {
      type: "TRAINING_UPDATE",
      category: "training",
      importance: "notable",
      scope: ctx.rikishiId ? "rikishi" : "heya",
      rikishiId: ctx.rikishiId,
      heyaId: ctx.heyaId,
      title: titleRes.text,
      summary: summaryRes.text,
      data: ctx,
      tags: ["training"],
    });
  },

  financialAlert: (world: WorldState, heyaId: Id, ctx: NarrativeContext) => {
    const rng = createRngForEvent(world, `finance-${heyaId}-${ctx.incident}`);
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
      tags: ["economy", ctx.incident as string],
    });
  },

  awardConferred: (world: WorldState, ctx: NarrativeContext) => {
    const rng = createRngForEvent(world, `award-${ctx.rikishiId}-${ctx.status}`);
    const titleRes = BardEngine.resolve(rng, "events.awards.title", ctx);
    const summaryRes = BardEngine.resolve(rng, "events.awards.summary", ctx);

    return logEngineEvent(world, {
      type: "AWARD_CONFERRED",
      category: "basho",
      importance: "headline",
      phase: "basho_wrap",
      scope: "rikishi",
      rikishiId: ctx.rikishiId,
      heyaId: ctx.heyaId,
      title: titleRes.text,
      summary: summaryRes.text,
      data: ctx,
      tags: ["basho", "award"],
    });
  },

  lifecycleEvent: (world: WorldState, ctx: NarrativeContext) => {
    const rng = createRngForEvent(world, `lifecycle-${ctx.rikishiId}-${ctx.status}`);
    const titleRes = BardEngine.resolve(rng, "events.lifecycle.title", ctx);
    const summaryRes = BardEngine.resolve(rng, "events.lifecycle.summary", ctx);

    return logEngineEvent(world, {
      type: "LIFECYCLE_EVENT",
      category: "career",
      importance: ctx.status === "retirement" ? "major" : "notable",
      scope: "rikishi",
      rikishiId: ctx.rikishiId,
      heyaId: ctx.heyaId,
      title: titleRes.text,
      summary: summaryRes.text,
      data: ctx,
      tags: ["career", ctx.status as string],
    });
  },

  bashoStatus: (world: WorldState, ctx: NarrativeContext) => {
    const rng = rngFromSeed(`basho-status-${ctx.status}-${ctx.day}`, "narrative", "event");
    const titleRes = BardEngine.resolve(rng, "events.basho.status_title", ctx);
    const summaryRes = BardEngine.resolve(rng, "events.basho.status_summary", ctx);

    return logEngineEvent(world, {
      type: "BASHO_STATUS",
      category: "basho",
      importance:
        ctx.status === "started" || ctx.status === "ended" || ctx.day === 15
          ? "headline"
          : "notable",
      phase: "basho_day",
      scope: "world",
      title: titleRes.text,
      summary: summaryRes.text,
      data: ctx,
      tags: ["basho", ctx.status as string],
    });
  },

  welfareCompliance: (world: WorldState, heyaId: Id, ctx: NarrativeContext) => {
    const rng = createRngForEvent(world, `welfare-${heyaId}-${ctx.status}`);
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
      tags: ["welfare", ctx.status as string],
    });
  },

  boutResolved: (world: WorldState, data: NarrativeContext) => {
    const rng = rngFromSeed(
      `bout-resolved-${data.winnerRikishiId}-${data.loserRikishiId}-${data.day}`,
      "narrative",
      "event"
    );
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
      tags: ["basho", "bout", "pbp"],
    });
  },

  recruitDiscovered: (world: WorldState, data: NarrativeContext) => {
    const rng = createRngForEvent(world, `recruit-${data.rikishiId}`);
    const res = BardEngine.resolve(rng, "events.recruiting.scouting_reports", data);
    const titleRes = BardEngine.resolve(rng, "events.recruiting.title", data);

    return logEngineEvent(world, {
      type: "RECRUIT_DISCOVERED",
      category: "scouting",
      importance: "notable",
      scope: "world",
      rikishiId: data.rikishiId,
      title: titleRes.text,
      summary: res.text,
      data,
      tags: ["scouting", "recruitment"],
    });
  },

  monthlyFinanceReport: (world: WorldState, data: NarrativeContext) => {
    const rng = createRngForEvent(world, `finance-tick-${data.heya}`);
    const res = BardEngine.resolve(rng, "events.economy.market_shifts", data);
    const titleRes = BardEngine.resolve(rng, "events.economy.title", data);

    return logEngineEvent(world, {
      type: "MONTHLY_FINANCE_REPORT",
      category: "economy",
      phase: "monthly",
      importance: "notable",
      scope: "heya",
      heyaId: data.heyaId,
      title: titleRes.text,
      summary: res.text,
      data,
      tags: ["economy", "finance"],
    });
  },

  rivalryHeatSpike: (world: WorldState, data: NarrativeContext) => {
    const rng = createRngForEvent(world, `rivalry-heat-${data.winner}-${data.loser}`);
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
      tags: ["rivalry", "hype"],
    });
  },

  oyakataMoodShift: (world: WorldState, heyaId: Id, data: NarrativeContext) => {
    const rng = createRngForEvent(world, `mood-${heyaId}`);
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
      tags: ["narrative", "mood"],
    });
  },

  managementDecision: (
    world: WorldState,
    heyaId: Id,
    data: NarrativeContext,
    importance: EventImportance = "minor"
  ) => {
    const rng = createRngForEvent(world, `mgmt-${heyaId}`);
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
      tags: ["management", "strategy"],
    });
  },

  strategyShift: (world: WorldState, heyaId: Id, data: NarrativeContext) => {
    const rng = createRngForEvent(world, `strategy-${heyaId}`);
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
      tags: ["narrative", "strategy"],
    });
  },

  facilityUpdate: (
    world: WorldState,
    heyaId: Id,
    data: NarrativeContext,
    type: "UPGRADED" | "DEGRADED"
  ) => {
    const rng = rngFromSeed(`facility-${heyaId}-${type}`, "narrative", "event");
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
      tags: ["facility", type.toLowerCase()],
    });
  },

  rosterEvent: (world: WorldState, heyaId: Id, data: NarrativeContext) => {
    const rng = rngFromSeed(`roster-${heyaId}-${data.rikishiId}`, "narrative", "event");
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
      tags: ["roster", "release"],
    });
  },

  prestigeEvent: (world: WorldState, heyaId: Id, data: NarrativeContext) => {
    const rng = createRngForEvent(world, `prestige-${heyaId}`);
    const titleRes = BardEngine.resolve(rng, "events.narrative.prestige_title", data);
    const summaryRes = BardEngine.resolve(rng, "events.narrative.prestige_summary", data);

    return logEngineEvent(world, {
      type: "AWARD_CONFERRED",
      category: "milestone",
      importance: "notable",
      scope: "heya",
      heyaId,
      title: titleRes.text,
      summary: summaryRes.text,
      data,
      tags: ["prestige", "milestone"],
    });
  },

  lifecycleAction: (
    world: WorldState,
    data: NarrativeContext,
    type: "naturalization" | "merger"
  ) => {
    const rng = rngFromSeed(
      `lifecycle-${type}-${data.rikishiId || data.heyaId}`,
      "narrative",
      "event"
    );
    const titleRes = BardEngine.resolve(rng, `events.lifecycle.${type}_title`, data);
    const summaryRes = BardEngine.resolve(rng, `events.lifecycle.${type}_summary`, data);

    return logEngineEvent(world, {
      type: "LIFECYCLE_EVENT",
      category: "career",
      importance: "major",
      scope: data.rikishiId ? "rikishi" : "heya",
      rikishiId: data.rikishiId,
      heyaId: data.heyaId,
      title: titleRes.text,
      summary: summaryRes.text,
      data,
      tags: ["lifecycle", type],
    });
  },

  financialAction: (
    world: WorldState,
    heyaId: Id,
    data: NarrativeContext,
    type: "loan" | "market"
  ) => {
    const rng = rngFromSeed(`finance-${type}-${heyaId}`, "narrative", "event");
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
      tags: ["economy", type],
    });
  },
};
