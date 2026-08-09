/**
 * dailyTick.ts
 * ============
 * Canon Daily Tick Orchestrator
 *
 * Orchestrates the daily tick sequence using the Strict Pipeline Architecture.
 * This file sets up transient context boundaries and delegates execution
 * to either the `bashoPipeline` or `offSeasonPipeline` based on the
 * current calendar state, rather than handling a monolithic execution sequence.
 *
 * Phase transitions are checked at the start of each day tick.
 * Daily micro-phases (e.g., small economic changes, welfare drops) run daily,
 * while heavy processing (training, governance, NPC AI) is batched into weekly
 * or monthly boundary runs.
 * ============
 */

import type { WorldState, CyclePhase } from "../types/world";
import {
  WEEKLY_TICK_THRESHOLD,
  MAX_DAYS_ADVANCE,
  POST_BASHO_DAYS,
  INTERIM_DAYS,
} from "../../constants/engine/npcStrategy";
import { DAYS_IN_MONTH, DEFAULT_MAX_DAY, MAX_MONTH } from "../../constants/engine/calendarExtended";
import { DEFAULT_START_YEAR } from "../../constants/engine/calendar";
import { warn } from "../utils/Logger";
import { shouldHaltAdvance } from "../loop/shouldHaltAdvance";
import { clearQueryCaches } from "../queries";

// ====
// TYPES
// ====

/** Defines the structure for daily tick report. */
export interface DailyTickReport {
  dayIndexGlobal: number;
  phase: CyclePhase;
  bashoDay?: number;
  phaseTransition?: { from: CyclePhase; to: CyclePhase };
  subsystemsRun: string[];
  monthBoundary?: boolean;
  yearBoundary?: boolean;
  [key: string]: unknown;
}

/**
 * P3.2: Unified advance options shared by all advance entry points.\n * All advance functions delegate to `advanceOneDay(world, opts)` or
 * `advanceDays(world, days, opts)`.
 */
export interface AdvanceOptions {
  /** Skip daily micro-phases (economy, welfare, sponsors, drama) for performance. */
  skipDailyMicroPhases?: boolean;
  /** If true, sets `_autonomousSim` before advancing (suppresses interactive halts). */
  autonomous?: boolean;
  /** If true, checks `shouldHaltAdvance` after each tick and stops if true. */
  haltOnPendingDecision?: boolean;
  /** Chunk size for progress reporting (used by multi-day advance). */
  chunkSize?: number;
  /** Optional progress callback invoked after each day. */
  onProgress?: (daysAdvanced: number, world: WorldState) => void;
}

// Migration complete: daily micro-logic moved to phases/phase01_daily_*.ts

// ====
// MAIN PIPELINE: AdvanceOneDay()
// ====

import { runPipeline } from "./pipelineRunner";
import * as phases from "./phases";
import { bashoPipeline } from "./pipelines/bashoPipeline";
import { offSeasonPipeline } from "./pipelines/offSeasonPipeline";

/**
 * AdvanceOneDay — the authoritative daily tick per Constitution A3.1.
 * Fully migrated to the Strict Pipeline Architecture.
 *
 * Execution flow:
 *   1. Preflight check: advances calendar, sets up transientContext boundaries.
 *   2. Daily Micro-Phases: conditionally runs economy, welfare, sponsors, and drama.
 *   3. Basho Bouts: if in `active_basho`, injects `phase01_basho_bouts` to run combat resolution.
 *   4. Weekly Gate: if 7 days passed, pushes `bashoPipeline` or `offSeasonPipeline`.
 *      Also consumes deferred boundaries to inject monthly (`phase05_monthly_boundary`, `phase01_monthly_market`)
 *      and yearly boundary phases.
 *
 * @param {WorldState} world - The current world state.
 * @param {Object} [opts] - Options to modify tick behavior.
 * @param {boolean} [opts.skipDailyMicroPhases] - Fast-forwards by skipping daily micro effects.
 * @returns {WorldState} The updated world state after one day tick.
 *
 * @example
 * ```ts
 * const nextWorld = advanceOneDay(world);
 * console.log(nextWorld.dayIndexGlobal);
 * ```
 */
export function advanceOneDay(world: WorldState, opts?: AdvanceOptions): WorldState {
  // P3.2: Apply autonomous flag if specified
  if (opts?.autonomous && !world._autonomousSim) {
    world = { ...world, _autonomousSim: true };
  }
  // 1. Run Preflight to advance calendar and determine boundaries
  let nextWorld = runPipeline(world, [phases.phase00_preflight]);

  // Halt pipeline if a blocking crisis or required decision was set during preflight.
  // Skip in autonomous runs (AutoSim, holiday) — there is no interactive player to
  // resolve it, so halting would freeze the whole world indefinitely.
  if (!nextWorld._autonomousSim && shouldHaltAdvance(nextWorld)) {
    return nextWorld;
  }

  const boundaries = nextWorld.transientContext?.boundaries || {
    monthBoundary: false,
    yearBoundary: false,
  };

  const daysSinceTick = (nextWorld._daysSinceLastWeeklyTick ?? 0) + 1;
  const isWeeklyTick = daysSinceTick >= WEEKLY_TICK_THRESHOLD;

  // 2. Determine which phases to run
  const activePhases: import("./pipelineRunner").PipelinePhase[] = [];

  if (!opts?.skipDailyMicroPhases) {
    activePhases.push(phases.phase01_daily_micro);
  }

  // P1.2: Bout resolution runs daily during active_basho (not just weekly).
  // This replaces the bashoSlice mutable bout-simulation path.
  if (nextWorld.cyclePhase === "active_basho") {
    activePhases.push(phases.phase01_basho_bouts);
  }

  if (isWeeklyTick) {
    // Clear query caches on weekly boundary (B1.2 — was daily in preflight, now weekly only)
    clearQueryCaches();

    if (nextWorld.cyclePhase === "active_basho") {
      activePhases.push(...bashoPipeline);
    } else {
      activePhases.push(...offSeasonPipeline);
    }

    // Consume deferred boundaries from previous non-weekly days in this cycle
    const pendingMonth = nextWorld.transientContext?.pendingMonthBoundary ?? false;
    const pendingYear = nextWorld.transientContext?.pendingYearBoundary ?? false;
    const effectiveMonthBoundary = boundaries.monthBoundary || pendingMonth;
    const effectiveYearBoundary = boundaries.yearBoundary || pendingYear;

    // If we have a deferred boundary, override boundaries so phases can detect it
    if (effectiveMonthBoundary && !boundaries.monthBoundary) {
      nextWorld = {
        ...nextWorld,
        transientContext: {
          ...nextWorld.transientContext,
          boundaries: {
            ...(nextWorld.transientContext?.boundaries ?? {
              monthBoundary: false,
              yearBoundary: false,
            }),
            monthBoundary: true,
          },
        },
      };
    }
    if (effectiveYearBoundary && !boundaries.yearBoundary) {
      nextWorld = {
        ...nextWorld,
        transientContext: {
          ...nextWorld.transientContext,
          boundaries: {
            ...(nextWorld.transientContext?.boundaries ?? {
              monthBoundary: false,
              yearBoundary: false,
            }),
            yearBoundary: true,
          },
        },
      };
    }

    // P3.7: Monthly market runs on month-boundary weekly ticks (not daily micro-phases)
    if (effectiveMonthBoundary) {
      activePhases.push(phases.phase05_monthly_boundary);
      activePhases.push(phases.phase01_monthly_market);
    }
    if (effectiveYearBoundary) {
      activePhases.push(phases.phase06_yearly_boundary);
    }
  }

  nextWorld = runPipeline(nextWorld, activePhases);

  // Clear deferred boundary flags after boundary phases have executed
  if (isWeeklyTick) {
    nextWorld = {
      ...nextWorld,
      transientContext: {
        ...nextWorld.transientContext,
        pendingMonthBoundary: false,
        pendingYearBoundary: false,
      },
    };
  }

  // 5. Update Weekly Tick Counter purely
  nextWorld = {
    ...nextWorld,
    _daysSinceLastWeeklyTick: isWeeklyTick ? 0 : daysSinceTick,
  };

  // 6. Finalize report in transient context (skip for fast advance)
  if (!opts?.skipDailyMicroPhases) {
    nextWorld = {
      ...nextWorld,
      transientContext: {
        ...nextWorld.transientContext,
        lastReport: buildDailyReport(nextWorld, isWeeklyTick),
      },
    };
  }

  return nextWorld;
}

function buildDailyReport(world: WorldState, isWeekly: boolean): DailyTickReport {
  const boundaries = world.transientContext?.boundaries || {
    monthBoundary: false,
    yearBoundary: false,
  };
  return {
    dayIndexGlobal: world.dayIndexGlobal,
    phase: world.cyclePhase,
    subsystemsRun: isWeekly ? ["weekly_pipeline"] : ["daily_micro"],
    monthBoundary: boundaries.monthBoundary,
    yearBoundary: boundaries.yearBoundary,
  };
}

// ====
// CONVENIENCE: Advance multiple days
// ====

/**
 * Advance multiple days.
 * Convenience function to advance the world state by N days.
 *
 * @param {WorldState} world - The current world state.
 * @param {number} days - Number of days to advance (capped at 365).
 * @returns {WorldState} The updated world state after N day ticks.
 *
 * @example
 * ```ts
 * const nextWorld = advanceDays(world, 7);
 * console.log(nextWorld.dayIndexGlobal);
 * ```
 */
export function advanceDays(world: WorldState, days: number, opts?: AdvanceOptions): WorldState {
  let currentWorld = opts?.autonomous ? { ...world, _autonomousSim: true } : world;
  if (days > MAX_DAYS_ADVANCE) {
    warn(`Input ${days} exceeds MAX_DAYS_ADVANCE (${MAX_DAYS_ADVANCE}); capping.`, "advanceDays");
  }
  const n = Math.max(1, Math.min(days, MAX_DAYS_ADVANCE));
  for (let i = 0; i < n; i++) {
    currentWorld = advanceOneDay(currentWorld, opts);
    if (opts?.haltOnPendingDecision && shouldHaltAdvance(currentWorld)) break;
    opts?.onProgress?.(i + 1, currentWorld);
  }
  return currentWorld;
}

/**
 * Advance multiple days, skipping daily micro-phases for performance.
 * Used for bulk advances (interim, auto-sim) where per-day micro-effects
 * are not material. Still runs preflight, weekly/monthly/yearly gates,
 * calendar advancement, and RNG deterministically.
 *
 * @param {WorldState} world - The current world state.
 * @param {number} days - Number of days to advance (capped at 365).
 * @returns {WorldState} The updated world state after N day ticks.
 */
export function advanceDaysFast(
  world: WorldState,
  days: number,
  opts?: AdvanceOptions
): WorldState {
  let currentWorld = opts?.autonomous ? { ...world, _autonomousSim: true } : world;
  if (days > MAX_DAYS_ADVANCE) {
    warn(
      `Input ${days} exceeds MAX_DAYS_ADVANCE (${MAX_DAYS_ADVANCE}); capping.`,
      "advanceDaysFast"
    );
  }
  const n = Math.max(1, Math.min(days, MAX_DAYS_ADVANCE));

  let daysRemaining = n;
  let daysAdvanced = 0;

  while (daysRemaining > 0) {
    // B1.1: Compute how many days we can safely batch-advance without
    // hitting a weekly gate, month/year boundary, or phase transition.
    // On those days we must run the full advanceOneDay pipeline.
    const daysToWeekly = WEEKLY_TICK_THRESHOLD - ((currentWorld._daysSinceLastWeeklyTick ?? 0) + 1);
    const daysToMonthBoundary = daysUntilMonthBoundary(currentWorld);
    const daysToYearBoundary = daysUntilYearBoundary(currentWorld);
    const daysToPhaseTransition = daysUntilPhaseTransition(currentWorld);

    // The safe batch is the minimum of all breakpoints, at least 1
    const safeBatch = Math.max(
      1,
      Math.min(
        daysRemaining,
        daysToWeekly,
        daysToMonthBoundary,
        daysToYearBoundary,
        daysToPhaseTransition
      )
    );

    if (safeBatch > 1) {
      // Batch-advance calendar and counters for (safeBatch - 1) days.
      // The last day of the batch will be handled by advanceOneDay
      // to run the full pipeline (weekly gate, boundary, or transition).
      const batchDays = safeBatch - 1;
      currentWorld = batchAdvanceCalendar(currentWorld, batchDays);
      for (let b = 1; b <= batchDays; b++) {
        daysAdvanced++;
        daysRemaining--;
        opts?.onProgress?.(daysAdvanced, currentWorld);
      }
    }

    // Run one full advanceOneDay for the boundary/transition day
    currentWorld = advanceOneDay(currentWorld, { ...opts, skipDailyMicroPhases: true });
    daysAdvanced++;
    daysRemaining--;
    opts?.onProgress?.(daysAdvanced, currentWorld);

    if (opts?.haltOnPendingDecision && shouldHaltAdvance(currentWorld)) break;
  }

  return currentWorld;
}

/**
 * B1.1: Batch-advance calendar and counters for N days without running
 * the full preflight pipeline. Replicates the exact logic from
 * phase00_preflight's advanceCalendarDay + counter decrements.
 */
function batchAdvanceCalendar(world: WorldState, days: number): WorldState {
  if (days <= 0) return world;

  const dayIndexGlobal = (world.dayIndexGlobal ?? 0) + days;
  let _interimDaysRemaining = world._interimDaysRemaining;
  let _postBashoDays = world._postBashoDays;

  // Decrement counters by N days (matching phase00_preflight logic)
  if (_interimDaysRemaining != null) {
    _interimDaysRemaining = _interimDaysRemaining - days;
  }
  if (_postBashoDays != null) {
    _postBashoDays = _postBashoDays - days;
  }

  // Advance calendar by N days (replicating advanceCalendarDay logic)
  let currentDay = world.calendar?.currentDay ?? 1;
  let month = world.calendar?.month ?? 1;
  let year = world.year ?? DEFAULT_START_YEAR;
  let currentWeek = world.calendar?.currentWeek ?? 1;

  for (let i = 0; i < days; i++) {
    currentDay += 1;
    const maxDay = DAYS_IN_MONTH[(month - 1) % MAX_MONTH] || DEFAULT_MAX_DAY;
    if (currentDay > maxDay) {
      currentDay = 1;
      month += 1;
      if (month > MAX_MONTH) {
        month = 1;
        year += 1;
        currentWeek += 1;
      }
    }
  }

  // Update _daysSinceLastWeeklyTick (will be < 7 since we stop before weekly gate)
  const daysSinceTick = (world._daysSinceLastWeeklyTick ?? 0) + days;

  return {
    ...world,
    dayIndexGlobal,
    _interimDaysRemaining,
    _postBashoDays,
    _daysSinceLastWeeklyTick: daysSinceTick,
    year,
    calendar: {
      ...world.calendar,
      currentDay,
      month,
      currentWeek,
    },
    week: currentWeek,
  };
}

/**
 * Compute days until the next month boundary (inclusive — returns 1 if today is the boundary).
 */
function daysUntilMonthBoundary(world: WorldState): number {
  const currentDay = world.calendar?.currentDay ?? 1;
  const month = world.calendar?.month ?? 1;
  const maxDay = DAYS_IN_MONTH[(month - 1) % MAX_MONTH] || DEFAULT_MAX_DAY;
  return maxDay - currentDay + 1;
}

/**
 * Compute days until the next year boundary (inclusive).
 */
function daysUntilYearBoundary(world: WorldState): number {
  const currentDay = world.calendar?.currentDay ?? 1;
  const month = world.calendar?.month ?? 1;
  let days = 0;
  let m = month;
  let d = currentDay;
  while (true) {
    const maxDay = DAYS_IN_MONTH[(m - 1) % MAX_MONTH] || DEFAULT_MAX_DAY;
    const remaining = maxDay - d + 1;
    days += remaining;
    if (m === MAX_MONTH) return days;
    m++;
    d = 1;
  }
}

/**
 * Compute days until a phase transition might occur.
 * Phase transitions fire when counters (_interimDaysRemaining, _postBashoDays) hit thresholds.
 * Returns a large number if no transition is possible within the advance window.
 */
function daysUntilPhaseTransition(world: WorldState): number {
  let minDays = MAX_DAYS_ADVANCE;

  const interim = world._interimDaysRemaining;
  if (interim != null) {
    if (interim > 0) {
      minDays = Math.min(minDays, interim);
    }
  } else if (world.cyclePhase === "interim" || world.cyclePhase === "banzuke_reveal") {
    // When _interimDaysRemaining is null/undefined, preflight uses (val ?? 0)
    // which triggers transitions immediately. Must run full pipeline on day 1.
    minDays = 1;
  }

  const postBasho = world._postBashoDays;
  if (postBasho != null) {
    if (postBasho > 0) {
      minDays = Math.min(minDays, postBasho);
    }
  } else if (world.cyclePhase === "post_basho") {
    minDays = 1;
  }

  return minDays;
}

// ====
// PHASE INITIALIZERS (called by world.ts on phase entry)
// ====

/**
 * Enter post-basho phase.
 * Transitions the world state to the post-basho phase with 7 wrap-up days.
 *
 * @param {WorldState} world - The current world state.
 * @returns {WorldState} The updated world state in post_basho phase.
 *
 * @example
 * ```ts
 * const nextWorld = enterPostBasho(world);
 * console.log(nextWorld.cyclePhase); // "post_basho"
 * ```
 */
export function enterPostBasho(world: WorldState): WorldState {
  return {
    ...world,
    cyclePhase: "post_basho",
    _postBashoDays: POST_BASHO_DAYS,
  };
}

/**
 * Enter interim phase.
 * Transitions the world state to the interim phase with 42 days (6 weeks).
 *
 * @param {WorldState} world - The current world state.
 * @returns {WorldState} The updated world state in interim phase.
 *
 * @example
 * ```ts
 * const nextWorld = enterInterim(world);
 * console.log(nextWorld.cyclePhase); // "interim"
 * console.log(nextWorld._interimDaysRemaining); // 42
 * ```
 */
export function enterInterim(world: WorldState): WorldState {
  return {
    ...world,
    cyclePhase: "interim",
    _interimDaysRemaining: INTERIM_DAYS, // Standard 6-week interim
  };
}
