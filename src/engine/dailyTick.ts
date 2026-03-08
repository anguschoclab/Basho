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
import { buildAllPerceptionSnapshots } from "./perception";
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
import * as facilities from "./facilities";
import { processWeeklyMediaBoundary, createDefaultMediaState, resetBashoMediaTracking } from "./media";
import { initializeBasho } from "./worldgen";
import * as schedule from "./schedule";
import { processYearEndInduction, HOF_CATEGORY_LABELS } from "./hallOfFame";
import { RANK_HIERARCHY } from "./banzuke";

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
      const remaining = world._interimDaysRemaining ?? 0;
      if (remaining <= 0) {
        // Auto-start the basho inline (avoid circular import with world.ts)
        const bashoName = world.currentBashoName || "hatsu";
        const basho = initializeBasho(world, bashoName);
        world.currentBasho = basho;
        world.cyclePhase = "active_basho";

        // Generate day 1 schedule
        try {
          if (typeof (schedule as any).generateDaySchedule === "function") {
            (schedule as any).generateDaySchedule(world, basho, 1, world.seed);
          }
        } catch (_) { /* schedule optional */ }

        // Reset basho-scoped media tracking
        const w = world as any;
        if (w.mediaState) {
          w.mediaState = resetBashoMediaTracking(w.mediaState);
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

  // Build perception cache FIRST — consumed by npcAI and UI (A7.1)
  safeCall(() => {
    const snapshots = buildAllPerceptionSnapshots(world);
    const cache: Record<string, import("./perception").PerceptionSnapshot> = {};
    for (const [id, snap] of snapshots) cache[id] = snap;
    world.perceptionCache = cache;
  }) && subs.push("perception_cache");

  safeCall(() => { npcAI.tickWeek?.(world); }) && subs.push("npcAI");
  safeCall(() => { training.tickWeek(world); }) && subs.push("training");
  safeCall(() => { injuries.tickWeek(world); }) && subs.push("injuries");
  safeCall(() => { economics.tickWeek(world); }) && subs.push("economics_weekly");
  safeCall(() => { welfare.tickWeek(world); }) && subs.push("welfare");
  safeCall(() => { governance.tickWeek(world); }) && subs.push("governance");
  safeCall(() => { rivalries.tickWeek(world); }) && subs.push("rivalries");
  safeCall(() => { events.tickWeek(world); }) && subs.push("events");
  safeCall(() => { scoutingStore.tickWeek(world); }) && subs.push("scouting");
  safeCall(() => { talentpool.tickWeek(world); }) && subs.push("talentpool");

  // Media weekly boundary — decay heat/pressure, generate features
  safeCall(() => {
    const w = world as any;
    if (!w.mediaState) w.mediaState = createDefaultMediaState();
    const { state } = processWeeklyMediaBoundary({
      state: w.mediaState,
      world,
      rivalries: (world as any).rivalriesState,
    });
    w.mediaState = state;
  }) && subs.push("media");

  // Recruitment window lifecycle — check if window should close
  safeCall(() => { tickRecruitmentWindowClose(world); }) && subs.push("recruitment_window");

  // Mid-interim recruitment window (Constitution: recruitment at week 3 of interim)
  safeCall(() => { tickMidInterimRecruitment(world); }) && subs.push("mid_interim_recruitment");

  // Autosave at weekly boundary (Constitution §6)
  safeCall(() => { autosave(world); });
}

/**
 * Check if the player's recruitment window should close.
 * Per A3.4, windows have a fixed duration set at open time.
 */
function tickRecruitmentWindowClose(world: WorldState): void {
  const rw = (world as any)._recruitmentWindow;
  if (!rw || !rw.isOpen) return;

  if (world.week >= rw.closesAtWeek) {
    rw.isOpen = false;

    if (world.playerHeyaId) {
      logEngineEvent(world, {
        type: "RECRUITMENT_WINDOW_CLOSED",
        category: "career",
        importance: "notable",
        scope: "heya",
        heyaId: world.playerHeyaId,
        title: "Recruitment window closed",
        summary: `The ${rw.phase === "post_basho" ? "post-basho" : "mid-interim"} recruitment window has closed.`,
        data: { phase: rw.phase, openedAtWeek: rw.openedAtWeek, closedAtWeek: world.week }
      });
    }
  }
}

/**
 * Mid-interim recruitment window (Constitution: recruitment occurs at mid-interim week 3).
 * Opens a second, shorter window for player and triggers NPC opportunistic recruitment.
 */
function tickMidInterimRecruitment(world: WorldState): void {
  if (world.cyclePhase !== "interim") return;

  const interimDaysRemaining = (world as any)._interimDaysRemaining ?? 0;
  const totalInterimDays = 42; // 6 weeks
  const elapsedDays = totalInterimDays - interimDaysRemaining;
  const elapsedWeeks = Math.floor(elapsedDays / 7);

  // Fire at week 3 of interim (roughly day 21)
  if (elapsedWeeks !== 3) return;

  // Don't re-open if a window is already open
  const existingWindow = (world as any)._recruitmentWindow;
  if (existingWindow?.isOpen) return;

  const playerHeya = world.playerHeyaId ? world.heyas.get(world.playerHeyaId) : null;

  if (playerHeya) {
    (world as any)._recruitmentWindow = {
      openedAtWeek: world.week,
      closesAtWeek: world.week + 2, // Shorter 2-week window
      vacancies: 0,
      isOpen: true,
      phase: "mid_interim"
    };

    logEngineEvent(world, {
      type: "RECRUITMENT_WINDOW_OPEN",
      category: "career",
      importance: "notable",
      scope: "heya",
      heyaId: playerHeya.id,
      title: "Mid-interim recruitment window",
      summary: "A brief mid-interim recruitment window opens. Scout and sign for 2 weeks.",
      data: {
        rosterSize: playerHeya.rikishiIds.length,
        windowDuration: 2,
        closesAtWeek: world.week + 2,
        phase: "mid_interim"
      }
    });
  }

  // NPC opportunistic recruitment during mid-interim
  safeCall(() => {
    const smallStables: Record<string, number> = {};
    for (const heya of world.heyas.values()) {
      if (heya.id === world.playerHeyaId) continue;
      if (heya.rikishiIds.length < 6) {
        smallStables[heya.id] = Math.max(1, 6 - heya.rikishiIds.length);
      }
    }
    if (Object.keys(smallStables).length > 0) {
      (talentpool as any).fillVacanciesForNPC?.(world, smallStables);
    }
  });
}

/**
 * Monthly boundary tick — Constitution A3.3.
 * Salaries/allowances, kōenkai income, rent/maintenance, loans/interest.
 */
function tickMonthlyBoundary(world: WorldState, subs: string[]): void {
  safeCall(() => { tickMonthlyEconomics(world); }) && subs.push("economics_monthly");
  safeCall(() => { facilities.tickMonthly(world); }) && subs.push("facilities");

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

  // 1. Hall of Fame induction pipeline (deterministic, from immutable history)
  let hofInductees: string[] = [];
  safeCall(() => {
    const { processYearEndInduction } = require("./hallOfFame");
    const inductees = processYearEndInduction(world);
    hofInductees = inductees.map((i: any) => i.shikona);

    // Log each induction as an event
    for (const inductee of inductees) {
      const { HOF_CATEGORY_LABELS } = require("./hallOfFame");
      const catLabel = HOF_CATEGORY_LABELS[inductee.category]?.name || inductee.category;
      logEngineEvent(world, {
        type: "HOF_INDUCTION",
        category: "milestone",
        importance: "headline",
        scope: "world",
        rikishiId: inductee.rikishiId,
        title: `Hall of Fame: ${inductee.shikona}`,
        summary: `${inductee.shikona} has been inducted into the Hall of Fame as a ${catLabel}.`,
        data: {
          category: inductee.category,
          year: newYear,
          yushoCount: inductee.stats.yushoCount ?? 0,
          consecutiveBasho: inductee.stats.consecutiveBasho ?? 0,
          ginoShoCount: inductee.stats.ginoShoCount ?? 0,
        },
        tags: ["hall_of_fame", "milestone"]
      });
    }
  }) && subs.push("hall_of_fame");

  // 2. Era label check (every 10 years)
  const isDecadeBoundary = newYear % 10 === 0;

  logEngineEvent(world, {
    type: "YEAR_BOUNDARY",
    category: "milestone",
    importance: isDecadeBoundary ? "headline" : "major",
    scope: "world",
    title: `Year ${newYear} begins`,
    summary: isDecadeBoundary
      ? `A new decade dawns. ${hofInductees.length > 0 ? `Hall of Fame inductees: ${hofInductees.join(", ")}.` : "No new Hall of Fame inductees this year."}`
      : `The sumo world enters year ${newYear}.${hofInductees.length > 0 ? ` HoF: ${hofInductees.join(", ")}.` : ""}`,
    data: { year: newYear, hofInductees: hofInductees.length, isDecade: isDecadeBoundary },
    tags: ["boundary", "year"]
  });

  // 3. Talent pool yearly refresh
  safeCall(() => { talentpool.tickYear(world); });

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
