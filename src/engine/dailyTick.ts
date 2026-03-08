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

import type { WorldState, CyclePhase } from "./types";
import { EventBus, logEngineEvent } from "./events";
import { BASHO_CALENDAR, getNextBasho, getInterimWeeks } from "./calendar";
import { autosave } from "./saveload";
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
  monthBoundary?: boolean;
  yearBoundary?: boolean;
}

// ============================================================================
// CALENDAR HELPERS
// ============================================================================

/** Days per month (non-leap for simplicity; deterministic) */
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

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

function getInterimDaysTotal(): number {
  return getInterimWeeks("hatsu", "haru") * 7; // Always 42 per canon
}

function checkPhaseTransition(world: WorldState): { from: CyclePhase; to: CyclePhase } | undefined {
  const prev = world.cyclePhase;

  switch (world.cyclePhase) {
    case "pre_basho": {
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
      break;
    }

    case "post_basho": {
      const remaining = (world as any)._postBashoDays ?? 7;
      if (remaining <= 0) {
        world.cyclePhase = "interim";
        (world as any)._interimDaysRemaining = getInterimDaysTotal() - 7;
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
// SUBSYSTEM TICKS
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
 * Daily micro-effects (fatigue recovery, daily food already handled in main pipeline).
 */
function tickDailyCommon(world: WorldState, subs: string[]): void {
  for (const r of world.rikishi.values()) {
    if (r.isRetired) continue;
    if (!r.injured && r.fatigue > 0) {
      r.fatigue = Math.max(0, r.fatigue - 0.3);
    }
  }
  subs.push("daily_fatigue");
}

/**
 * Weekly subsystem tick — called once every 7 daily ticks.
 * Canon A3.2: training, injuries, economy weekly, governance, welfare, scouting, etc.
 */
function tickWeeklySubsystems(world: WorldState, subs: string[]): void {
  world.week += 1;
  if (world.calendar) {
    world.calendar.currentWeek = world.week;
  }

  safeCall(() => { npcAI.tickWeek?.(world); }) && subs.push("npcAI");
  safeCall(() => { training.tickWeek(world); }) && subs.push("training");
  safeCall(() => { (injuries as any).tickWeek?.(world); }) && subs.push("injuries");
  safeCall(() => { economics.tickWeek(world); }) && subs.push("economics_weekly");
  safeCall(() => { welfare.tickWeek(world); }) && subs.push("welfare");
  safeCall(() => { governance.tickWeek(world); }) && subs.push("governance");
  safeCall(() => { (rivalries as any).tickWeek?.(world); }) && subs.push("rivalries");
  safeCall(() => { events.tickWeek(world); }) && subs.push("events");
  safeCall(() => { (scoutingStore as any).tickWeek?.(world); }) && subs.push("scouting");
  safeCall(() => { (talentpool as any).tickWeek?.(world); }) && subs.push("talentpool");

  // Autosave at weekly boundary (Constitution §6)
  safeCall(() => { autosave(world); });
}

/**
 * Monthly boundary tick — Constitution A3.3.
 * Salaries/allowances, kōenkai income, rent/maintenance, loans/interest.
 */
function tickMonthlyBoundary(world: WorldState, subs: string[]): void {
  safeCall(() => { tickMonthlyEconomics(world); }) && subs.push("economics_monthly");

  logEngineEvent(world, {
    type: "MONTHLY_BOUNDARY",
    category: "economy",
    importance: "minor",
    scope: "world",
    title: "Month-end financial cycle",
    summary: `Monthly salaries, rent, and supporter income processed for month ${world.calendar.month}.`,
    data: { year: world.calendar.year, month: world.calendar.month },
    tags: ["economy", "boundary"]
  });

  // Autosave at monthly boundary (Constitution §6)
  safeCall(() => { autosave(world); });
}

/**
 * Monthly economy postings per A3.3:
 * - Sekitori salaries (league → rikishi accounts)
 * - Kōenkai/supporter income (→ heya funds)
 * - Rent/maintenance & facility upkeep
 * - Loans/interest
 */
function tickMonthlyEconomics(world: WorldState): void {
  const { RANK_HIERARCHY } = require("./banzuke");

  for (const heya of world.heyas.values()) {
    // 1. Sekitori monthly salaries (paid to rikishi, deducted from heya as payroll)
    let totalSalaries = 0;
    for (const rId of heya.rikishiIds) {
      const r = world.rikishi.get(rId);
      if (!r) continue;
      const info = RANK_HIERARCHY[r.rank];
      if (info?.isSekitori) {
        const salary = info.salary ?? 0;
        // Credit rikishi account
        if (!r.economics) {
          r.economics = { cash: 0, retirementFund: 0, careerKenshoWon: 0, kinboshiCount: 0, totalEarnings: 0, currentBashoEarnings: 0, popularity: 50 };
        }
        r.economics.cash += salary;
        r.economics.totalEarnings += salary;
        totalSalaries += salary;
      } else {
        // Lower division allowance (~¥70k/month)
        totalSalaries += 70_000;
      }
    }

    // 2. Oyakata monthly salary
    const oyakataSalary = 1_200_000;
    totalSalaries += oyakataSalary;

    // 3. Rent / maintenance / facility upkeep
    const facilityUpkeep =
      (heya.facilities.training * 4000) +
      (heya.facilities.recovery * 4000) +
      (heya.facilities.nutrition * 8000);

    // 4. Kōenkai/supporter monthly income
    const koenkaiBands: Record<string, number> = {
      none: 0,
      weak: 200_000,
      moderate: 800_000,
      strong: 2_000_000,
      powerful: 5_000_000
    };
    const supporterIncome = koenkaiBands[heya.koenkaiBand] ?? 500_000;

    // 5. Apply net
    const totalExpenses = totalSalaries + facilityUpkeep;
    const net = supporterIncome - totalExpenses;
    heya.funds += net;

    // 6. Update runway band
    const monthlyBurn = Math.max(1, totalExpenses);
    const runwayMonths = heya.funds / monthlyBurn;
    if (runwayMonths >= 12) heya.runwayBand = "secure";
    else if (runwayMonths >= 6) heya.runwayBand = "comfortable";
    else if (runwayMonths >= 3) heya.runwayBand = "tight";
    else if (runwayMonths >= 1) heya.runwayBand = "critical";
    else heya.runwayBand = "desperate";

    // 7. Emit financial events for player heya
    if (heya.id === world.playerHeyaId) {
      if (heya.funds < 0) {
        logEngineEvent(world, {
          type: "MONTHLY_DEFICIT",
          category: "economy",
          importance: "major",
          scope: "heya",
          heyaId: heya.id,
          title: "Monthly deficit",
          summary: `${heya.name} is operating at a deficit. Runway: ${heya.runwayBand}.`,
          data: { net, runway: heya.runwayBand },
          tags: ["economy"]
        });
      }
    }
  }
}

/**
 * Year boundary tick — Constitution A3.5.
 * HoF eligibility, era labels, annual financial summary.
 */
function tickYearBoundary(world: WorldState, subs: string[]): void {
  const newYear = world.calendar.year;
  world.year = newYear;

  // 1. Hall of Fame eligibility scan
  const hofCandidates: string[] = [];
  for (const r of world.rikishi.values()) {
    if (r.rank === "yokozuna" && r.careerWins >= 500) {
      hofCandidates.push(r.shikona || r.name || r.id);
    }
  }

  // 2. Era label check (every 10 years)
  const isDecadeBoundary = newYear % 10 === 0;

  logEngineEvent(world, {
    type: "YEAR_BOUNDARY",
    category: "milestone",
    importance: isDecadeBoundary ? "headline" : "major",
    scope: "world",
    title: `Year ${newYear} begins`,
    summary: isDecadeBoundary
      ? `A new decade dawns. ${hofCandidates.length > 0 ? `HoF candidates: ${hofCandidates.join(", ")}.` : "No HoF candidates this year."}`
      : `The sumo world enters year ${newYear}.`,
    data: { year: newYear, hofCandidates: hofCandidates.length, isDecade: isDecadeBoundary },
    tags: ["boundary", "year"]
  });

  // 3. Talent pool yearly refresh
  safeCall(() => { (talentpool as any).tickYear?.(world); });

  subs.push("year_boundary");

  // Autosave at year boundary
  safeCall(() => { autosave(world); });
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
    const dailyFoodCost = (heya.rikishiIds?.length ?? 0) * 3000;
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

export function advanceDays(world: WorldState, days: number): DailyTickReport[] {
  const reports: DailyTickReport[] = [];
  const n = Math.max(1, Math.min(days, 365));
  for (let i = 0; i < n; i++) {
    reports.push(advanceOneDay(world));
  }
  return reports;
}

export function advanceFullInterim(world: WorldState): DailyTickReport[] {
  if (world.cyclePhase !== "interim" && world.cyclePhase !== "pre_basho") return [];
  const totalDays = getInterimDaysTotal();
  return advanceDays(world, totalDays);
}

// ============================================================================
// PHASE INITIALIZERS (called by world.ts on phase entry)
// ============================================================================

export function enterPostBasho(world: WorldState): void {
  world.cyclePhase = "post_basho";
  (world as any)._postBashoDays = 7;
}

export function enterInterim(world: WorldState): void {
  world.cyclePhase = "interim";
  (world as any)._interimDaysRemaining = getInterimDaysTotal();
}
