/**
 * dailyTick.ts
 * =======================================================
 * Canon Daily Tick Pipeline (A3.1 / A4.1)
 *
 * Implements the authoritative AdvanceOneDay() pipeline from the
 * Basho Constitution v1.2. Each day tick runs a deterministic,
 * ordered sequence of subsystem updates.
 *
 * Tick granularity per constitution:
 *   - Basho phase: 15 daily ticks (combat days)
 *   - Inter-basho: 6 weekly ticks (each = 7 daily ticks internally)
 *   - Pre-basho: 7 daily ticks (preparation week)
 *   - Post-basho: 7 daily ticks (wrap-up week)
 *
 * Phase transitions are checked at the start of each day tick.
 * =======================================================
 */

import type { WorldState, CyclePhase } from "./types";
import { EventBus, logEngineEvent } from "./events";
import { BASHO_CALENDAR, getNextBasho, getInterimWeeks } from "./calendar";
import * as training from "./training";
import * as injuries from "./injuries";
import * as economics from "./economics";
import * as governance from "./governance";
import * as welfare from "./welfare";
import * as events from "./events";
import * as rivalries from "./rivalries";
import * as npcAI from "./npcAI";
import * as scoutingStore from "./scoutingStore";
import * as talentpool from "./talentpool";

// ============================================================================
// TYPES
// ============================================================================

export interface DailyTickReport {
  dayIndexGlobal: number;
  phase: CyclePhase;
  bashoDay?: number;
  phaseTransition?: { from: CyclePhase; to: CyclePhase };
  subsystemsRun: string[];
}

// ============================================================================
// PHASE TRANSITION LOGIC
// ============================================================================

/**
 * Interim is modeled as 6 weeks × 7 days = 42 days.
 * Pre-basho: last 7 days of interim (preparation).
 * Post-basho: 7 days after basho ends.
 *
 * We track `interimDaysRemaining` on the world to know when to transition.
 */

function getInterimDaysTotal(): number {
  return getInterimWeeks("hatsu", "haru") * 7; // Always 42 per canon
}

/**
 * Check and apply phase transitions at the start of a day tick.
 * Returns the transition info if one occurred.
 */
function checkPhaseTransition(world: WorldState): { from: CyclePhase; to: CyclePhase } | undefined {
  const prev = world.cyclePhase;

  switch (world.cyclePhase) {
    case "pre_basho": {
      // Pre-basho lasts 7 days (tracked via interimDaysRemaining)
      const remaining = (world as any)._interimDaysRemaining ?? 0;
      if (remaining <= 0) {
        world.cyclePhase = "active_basho";
        logEngineEvent(world, {
          type: "PHASE_TRANSITION",
          category: "basho",
          importance: "major",
          scope: "world",
          title: "Pre-basho preparation complete",
          summary: "The tournament is about to begin.",
          data: { from: prev, to: world.cyclePhase },
          tags: ["phase"]
        });
        return { from: prev, to: world.cyclePhase };
      }
      break;
    }

    case "active_basho": {
      // Basho lasts 15 days; transition handled by endBasho in world.ts
      // No automatic transition here — game flow controls this
      break;
    }

    case "post_basho": {
      const remaining = (world as any)._postBashoDays ?? 7;
      if (remaining <= 0) {
        world.cyclePhase = "interim";
        (world as any)._interimDaysRemaining = getInterimDaysTotal() - 7; // Subtract pre-basho week
        logEngineEvent(world, {
          type: "PHASE_TRANSITION",
          category: "basho",
          importance: "notable",
          scope: "world",
          title: "Post-basho period ends",
          summary: "The inter-basho period begins.",
          data: { from: prev, to: world.cyclePhase },
          tags: ["phase"]
        });
        return { from: prev, to: world.cyclePhase };
      }
      break;
    }

    case "interim": {
      const remaining = (world as any)._interimDaysRemaining ?? 0;
      if (remaining <= 7) {
        // Enter pre-basho phase (last 7 days before tournament)
        world.cyclePhase = "pre_basho";
        (world as any)._interimDaysRemaining = 7;
        logEngineEvent(world, {
          type: "PHASE_TRANSITION",
          category: "basho",
          importance: "notable",
          scope: "world",
          title: "Pre-basho preparation begins",
          summary: `Stables begin final preparations for the upcoming ${world.currentBashoName ?? "basho"}.`,
          data: { from: prev, to: world.cyclePhase, bashoName: world.currentBashoName },
          tags: ["phase"]
        });
        return { from: prev, to: world.cyclePhase };
      }
      break;
    }
  }

  return undefined;
}

// ============================================================================
// SUBSYSTEM TICKS (DAILY GRANULARITY)
// ============================================================================

function safeCall(fn: () => void): boolean {
  try {
    fn();
    return true;
  } catch {
    return false;
  }
}

/**
 * Run subsystems that tick daily regardless of phase.
 * These are lightweight daily maintenance ticks.
 */
function tickDailyCommon(world: WorldState, subs: string[]): void {
  // Daily fatigue drift (micro-effect per A3.1 step 2)
  // Training does major progression weekly; here we just do micro-recovery
  for (const r of world.rikishi.values()) {
    if (r.isRetired) continue;
    // Micro-recovery: 0.5 fatigue per day if resting
    if (!r.injured && r.fatigue > 0) {
      r.fatigue = Math.max(0, r.fatigue - 0.3);
    }
  }
  subs.push("daily_fatigue");
}

/**
 * Weekly subsystem tick — called once every 7 daily ticks.
 * This is the canonical weekly tick from the existing pipeline.
 */
function tickWeeklySubsystems(world: WorldState, subs: string[]): void {
  world.week += 1;
  if (world.calendar) {
    world.calendar.currentWeek = world.week;
  }

  safeCall(() => { npcAI.tickWeek?.(world); }) && subs.push("npcAI");
  safeCall(() => { training.tickWeek(world); }) && subs.push("training");
  safeCall(() => { (injuries as any).tickWeek?.(world); }) && subs.push("injuries");
  safeCall(() => { economics.tickWeek(world); }) && subs.push("economics");
  safeCall(() => { welfare.tickWeek(world); }) && subs.push("welfare");
  safeCall(() => { governance.tickWeek(world); }) && subs.push("governance");
  safeCall(() => { (rivalries as any).tickWeek?.(world); }) && subs.push("rivalries");
  safeCall(() => { events.tickWeek(world); }) && subs.push("events");
  safeCall(() => { (scoutingStore as any).tickWeek?.(world); }) && subs.push("scouting");
  safeCall(() => { (talentpool as any).tickWeek?.(world); }) && subs.push("talentpool");
}

// ============================================================================
// MAIN PIPELINE: AdvanceOneDay()
// ============================================================================

/**
 * AdvanceOneDay — the authoritative daily tick per Constitution A3.1.
 *
 * Pipeline order:
 *   0) Preflight: increment day, compute DaySeed, check phase transitions
 *   1) Scheduled institutional events (governance, loans, sponsors)
 *   2) Training & welfare micro-effects (daily)
 *   3) Basho tournament day (if active_basho) — handled externally via game flow
 *   4) Post-bout downstream updates
 *   5) Economy cadence (daily micro)
 *   6) Weekly tick gate (every 7 days)
 *   7) UI notification digest queued
 */
export function advanceOneDay(world: WorldState): DailyTickReport {
  const subsystemsRun: string[] = [];

  // 0) Preflight
  world.dayIndexGlobal = (world.dayIndexGlobal ?? 0) + 1;
  if (world.calendar) {
    world.calendar.currentDay = (world.calendar.currentDay ?? 0) + 1;
  }

  // Decrement phase-specific day counters
  if ((world as any)._interimDaysRemaining != null) {
    (world as any)._interimDaysRemaining -= 1;
  }
  if ((world as any)._postBashoDays != null) {
    (world as any)._postBashoDays -= 1;
  }

  // Phase transition check
  const transition = checkPhaseTransition(world);

  const report: DailyTickReport = {
    dayIndexGlobal: world.dayIndexGlobal,
    phase: world.cyclePhase,
    phaseTransition: transition,
    subsystemsRun,
  };

  // 1) Scheduled institutional events
  // Governance docket items, loan payments, sponsor expirations
  // These are handled within their weekly ticks for now; daily hooks are stubs
  subsystemsRun.push("scheduled_events");

  // 2) Training & welfare micro-effects (daily)
  tickDailyCommon(world, subsystemsRun);

  // 3) Basho tournament day
  // Combat is NOT auto-run here — it's driven by the game UI flow
  // (simulateBout / simulateAllBouts in GameContext)
  if (world.cyclePhase === "active_basho" && world.currentBasho) {
    report.bashoDay = world.currentBasho.day;
  }

  // 4) Post-bout downstream updates
  // Handled inline in applyBoutResult (rivalries, scouting, economics)

  // 5) Daily economy micro-tick
  // Lightweight daily cost: food (~1/7 of weekly facility cost)
  for (const heya of world.heyas.values()) {
    const dailyFoodCost = (heya.rikishiIds?.length ?? 0) * 3000; // ~¥3k/day per rikishi
    heya.funds -= dailyFoodCost;
  }
  subsystemsRun.push("daily_economy");

  // 6) Weekly tick gate — trigger full weekly subsystem pass every 7 days
  if (world.dayIndexGlobal % 7 === 0) {
    tickWeeklySubsystems(world, subsystemsRun);
  }

  // 7) UI digest is built on-demand by uiDigest.ts, not here

  return report;
}

// ============================================================================
// CONVENIENCE: Advance multiple days
// ============================================================================

/**
 * Advance N days, collecting reports.
 * Used by auto-sim / holiday mode.
 */
export function advanceDays(world: WorldState, days: number): DailyTickReport[] {
  const reports: DailyTickReport[] = [];
  const n = Math.max(1, Math.min(days, 365)); // Safety cap
  for (let i = 0; i < n; i++) {
    reports.push(advanceOneDay(world));
  }
  return reports;
}

/**
 * Advance one full interim period (42 days = 6 weeks).
 * Replaces the old advanceInterim(world, weeks) for daily-granularity mode.
 */
export function advanceFullInterim(world: WorldState): DailyTickReport[] {
  if (world.cyclePhase !== "interim" && world.cyclePhase !== "pre_basho") return [];
  const totalDays = getInterimDaysTotal();
  return advanceDays(world, totalDays);
}

// ============================================================================
// PHASE INITIALIZERS (called by world.ts on phase entry)
// ============================================================================

/**
 * Initialize post-basho phase tracking.
 * Called from world.ts endBasho().
 */
export function enterPostBasho(world: WorldState): void {
  world.cyclePhase = "post_basho";
  (world as any)._postBashoDays = 7;
}

/**
 * Initialize interim phase tracking.
 * Called after post-basho completes or on world generation.
 */
export function enterInterim(world: WorldState): void {
  world.cyclePhase = "interim";
  (world as any)._interimDaysRemaining = getInterimDaysTotal();
}
