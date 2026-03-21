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
 *
 * Boundary ticks per constitution:
 *   - Weekly (A3.2): every 7 days — training, injuries, economy, governance, etc.
 *   - Monthly (A3.3): on month boundary — salaries, rent, kōenkai, loans
 *   - Year (A3.5): on year boundary — HoF, era labels, annual summary
 * =======================================================
 */

import type { WorldState, CyclePhase } from "./types/world";
import { EventBus, logEngineEvent } from "./events";
import { BASHO_CALENDAR, getNextBasho, getInterimWeeks } from "./calendar";
import { initializeBasho } from "./worldgen";
import { toRikishiDescriptor } from "./descriptorBands";
import * as schedule from "./schedule";
import { needsScheduleForDay } from "./schedule";
import { ensureHeyaWelfareState } from "./welfare";
import { resetBashoMediaTracking } from "./media";

import { tickWeeklySubsystems } from "./tick/tickWeekly";
import { tickMonthlyBoundary } from "./tick/tickMonthly";
import { tickYearBoundary } from "./tick/tickYearly";

// ============================================================================
// TYPES
// ============================================================================

/** Defines the structure for daily tick report. */
export interface DailyTickReport {
  dayIndexGlobal: number;
  phase: CyclePhase;
  bashoDay?: number;
  phaseTransition?: { from: CyclePhase; to: CyclePhase };
  subsystemsRun: string[];
  monthBoundary?: boolean;
  yearBoundary?: boolean;
}

// ============================================================================
// CALENDAR HELPERS
// ============================================================================

/** Days per month (non-leap for simplicity; deterministic) */
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/**
 * Days in month.
 *  * @param month - The Month.
 *  * @param _year - The _year.
 *  * @returns The result.
 */
function daysInMonth(month: number, _year: number): number {
  return DAYS_IN_MONTH[(month - 1) % 12] || 30;
}

/**
 * Advance the calendar by one day, updating month/year as needed.
 * Returns flags for month and year boundaries crossed.
 */
function advanceCalendarDay(world: WorldState): { monthBoundary: boolean; yearBoundary: boolean } {
  const cal = world.calendar;
  let monthBoundary = false;
  let yearBoundary = false;

  cal.currentDay = (cal.currentDay ?? 1) + 1;

  const maxDay = daysInMonth(cal.month, cal.year);
  if (cal.currentDay > maxDay) {
    cal.currentDay = 1;
    cal.month += 1;
    monthBoundary = true;

    if (cal.month > 12) {
      cal.month = 1;
      cal.year += 1;
      yearBoundary = true;
    }
  }

  return { monthBoundary, yearBoundary };
}

// ============================================================================
// PHASE TRANSITION LOGIC
// ============================================================================

/**
 * Get interim days total.
 *  * @returns The result.
 */
function getInterimDaysTotal(): number {
  return getInterimWeeks("hatsu", "haru") * 7; // Always 42 per canon
}

/**
 * Check phase transition.
 *  * @param world - The World.
 *  * @returns The result.
 */
function checkPhaseTransition(world: WorldState): { from: CyclePhase; to: CyclePhase } | undefined {
  const prev = world.cyclePhase;

  switch (world.cyclePhase) {
    case "pre_basho": {
      const remaining = world._interimDaysRemaining ?? 0;
      if (remaining <= 0) {
        // Auto-start the basho inline (avoid circular import with world.ts)
        const bashoName = world.currentBashoName || "hatsu";
        const basho = initializeBasho(world, bashoName);
        world.currentBasho = basho;
        world.cyclePhase = "active_basho";

        // Generate day 1 schedule (guard with needsScheduleForDay)
        try {
          if (needsScheduleForDay("makuuchi", 1) && typeof schedule.generateDaySchedule === "function") {
            schedule.generateDaySchedule(world, basho, 1, world.seed);
          }
        } catch (_) { /* schedule optional */ }

        // Reset basho-scoped media tracking
        if (world.mediaState) {
          world.mediaState = resetBashoMediaTracking(world.mediaState);
        }

        EventBus.bashoStarted(world, bashoName);

        logEngineEvent(world, {
          type: "PHASE_TRANSITION",
          category: "basho",
          importance: "major",
          scope: "world",
          title: "Basho begins automatically",
          summary: "The tournament is now underway.",
          data: { from: prev, to: world.cyclePhase },
          tags: ["phase"]
        });
        return { from: prev, to: world.cyclePhase };
      }
      break;
    }

    case "active_basho": {
      // Basho lasts 15 days; transition handled by endBasho in world.ts
      break;
    }

    case "post_basho": {
      const remaining = world._postBashoDays ?? 7;
      if (remaining <= 0) {
        world.cyclePhase = "interim";
        world._interimDaysRemaining = getInterimDaysTotal() - 7;
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
      const remaining = world._interimDaysRemaining ?? 0;
      if (remaining <= 7) {
        world.cyclePhase = "pre_basho";
        world._interimDaysRemaining = 7;
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
// SUBSYSTEM TICKS
// ============================================================================

/**
 * Daily micro-effects (fatigue recovery, daily food already handled in main pipeline).
 */
function tickDailyCommon(world: WorldState, subs: string[]): void {
  for (const r of world.rikishi.values()) {
    if (r.isRetired) continue;

    // Persist descriptor for UI hysteresis buffer
    r.descriptor = toRikishiDescriptor(r, r.descriptor);

    // Diet effects
    const heya = world.heyas.get(r.heyaId);
    if (heya) {
      const welfare = ensureHeyaWelfareState(heya);
      const diet = welfare.activeDiet || "maintenance";

      if (diet === "austerity") {
        r.weight = Math.max(70, r.weight - 0.05);
        if (r.stats) r.stats.mental = Math.max(1, (r.stats.mental || 50) - 0.5);
      } else if (diet === "heavy_bulk") {
        r.weight += 0.1;
        if (r.stats) r.stats.mental = Math.max(1, (r.stats.mental || 50) - 0.2);
      } else if (diet === "premium") {
        r.weight += 0.08;
        if (r.stats) r.stats.mental = Math.min(100, (r.stats.mental || 50) + 0.5);
        if (!r.injured && r.fatigue > 0) {
          r.fatigue = Math.max(0, r.fatigue - 1); // bonus recovery
        }
      }
    }

    if (!r.injured && r.fatigue > 0) {
      r.fatigue = Math.max(0, r.fatigue - 0.3);
    }
  }
  subs.push("daily_fatigue");
}

// ============================================================================
// MAIN PIPELINE: AdvanceOneDay()
// ============================================================================

/**
 * AdvanceOneDay — the authoritative daily tick per Constitution A3.1.
 *
 * Pipeline order:
 *   0) Preflight: increment day, advance calendar, check phase transitions
 *   1) Scheduled institutional events (governance, loans, sponsors)
 *   2) Training & welfare micro-effects (daily)
 *   3) Basho tournament day (if active_basho) — handled externally via game flow
 *   4) Post-bout downstream updates
 *   5) Economy cadence (daily micro)
 *   6) Weekly tick gate (every 7 days)
 *   7) Monthly tick gate (on month boundary)
 *   8) Year tick gate (on year boundary)
 *   9) UI digest batch
 */
export function advanceOneDay(world: WorldState): DailyTickReport {
  const subsystemsRun: string[] = [];

  // 0) Preflight — advance global day index
  world.dayIndexGlobal = (world.dayIndexGlobal ?? 0) + 1;

  // Advance calendar (month, dayOfMonth, year)
  const { monthBoundary, yearBoundary } = advanceCalendarDay(world);

  // Decrement phase-specific day counters
  if (world._interimDaysRemaining != null) {
    world._interimDaysRemaining -= 1;
  }
  if (world._postBashoDays != null) {
    world._postBashoDays -= 1;
  }

  // Phase transition check
  const transition = checkPhaseTransition(world);

  const report: DailyTickReport = {
    dayIndexGlobal: world.dayIndexGlobal,
    phase: world.cyclePhase,
    phaseTransition: transition,
    subsystemsRun,
    monthBoundary,
    yearBoundary,
  };

  // 1) Scheduled institutional events
  subsystemsRun.push("scheduled_events");

  // 2) Training & welfare micro-effects (daily)
  tickDailyCommon(world, subsystemsRun);

  // 3) Basho tournament day — driven by game UI flow externally
  if (world.cyclePhase === "active_basho" && world.currentBasho) {
    report.bashoDay = world.currentBasho.day;
  }

  // 5) Daily economy micro-tick (food costs)
  for (const heya of world.heyas.values()) {
    const welfare = ensureHeyaWelfareState(heya);
    const diet = welfare.activeDiet || "maintenance";
    const costPerRikishi = diet === "austerity" ? 1000 : diet === "maintenance" ? 3000 : diet === "heavy_bulk" ? 6000 : 10000;
    const dailyFoodCost = (heya.rikishiIds?.length ?? 0) * costPerRikishi;
    heya.funds -= dailyFoodCost;
  }
  subsystemsRun.push("daily_economy");

  // 6) Weekly tick gate — trigger full weekly subsystem pass every 7 days
  if (world.dayIndexGlobal % 7 === 0) {
    tickWeeklySubsystems(world, subsystemsRun);
  }

  // 7) Monthly tick gate
  if (monthBoundary) {
    tickMonthlyBoundary(world, subsystemsRun);
  }

  // 8) Year tick gate
  if (yearBoundary) {
    tickYearBoundary(world, subsystemsRun);
  }

  return report;
}

// ============================================================================
// CONVENIENCE: Advance multiple days
// ============================================================================

/**
 * Advance days.
 *  * @param world - The World.
 *  * @param days - The Days.
 *  * @returns The result.
 */
export function advanceDays(world: WorldState, days: number): DailyTickReport[] {
  const reports: DailyTickReport[] = [];
  const n = Math.max(1, Math.min(days, 365));
  for (let i = 0; i < n; i++) {
    reports.push(advanceOneDay(world));
  }
  return reports;
}

/**
 * Advance full interim.
 *  * @param world - The World.
 *  * @returns The result.
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
 * Enter post basho.
 *  * @param world - The World.
 */
export function enterPostBasho(world: WorldState): void {
  world.cyclePhase = "post_basho";
  world._postBashoDays = 7;
}

/**
 * Enter interim.
 *  * @param world - The World.
 */
export function enterInterim(world: WorldState): void {
  world.cyclePhase = "interim";
  world._interimDaysRemaining = getInterimDaysTotal();
}
