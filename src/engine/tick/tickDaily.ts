/**
 * dailyTick.ts
 * =======
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
 * =======
 */

import type { WorldState, CyclePhase } from "../types/world";
import {
  WEEKLY_TICK_THRESHOLD,
  MAX_DAYS_ADVANCE,
  POST_BASHO_DAYS,
  INTERIM_DAYS,
} from "../../constants/engine/npcStrategy";

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

// Migration complete: daily micro-logic moved to phases/phase01_daily_*.ts

// ====
// MAIN PIPELINE: AdvanceOneDay()
// ====

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
import { runPipeline } from "./pipelineRunner";
import * as phases from "./phases";
import { bashoPipeline } from "./pipelines/bashoPipeline";
import { offSeasonPipeline } from "./pipelines/offSeasonPipeline";

/**
 * AdvanceOneDay — the authoritative daily tick per Constitution A3.1.
 * Now fully migrated to the Strict Pipeline Architecture.
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
 *
 * @param {WorldState} world - The current world state.
 * @returns {WorldState} The updated world state after one day tick.
 *
 * @example
 * ```ts
 * const nextWorld = advanceOneDay(world);
 * console.log(nextWorld.dayIndexGlobal);
 * ```
 */
export function advanceOneDay(
  world: WorldState,
  opts?: { skipDailyMicroPhases?: boolean }
): WorldState {
  // 1. Run Preflight to advance calendar and determine boundaries
  let nextWorld = runPipeline(world, [phases.phase00_preflight]);

  // Plan 3: Halt pipeline if a blocking crisis/loop decision was set during preflight.
  // Skip in autonomous runs (AutoSim, holiday) — there is no interactive player to
  // resolve it, so halting would freeze the whole world indefinitely.
  if (nextWorld.pendingCrisis && !nextWorld._autonomousSim) {
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
    activePhases.push(
      phases.phase01_daily_economy,
      phases.phase01_daily_welfare,
      phases.phase01_daily_sponsors,
      phases.phase01_daily_drama,
      phases.phase01_monthly_market
    );
  }

  if (isWeeklyTick) {
    if (nextWorld.cyclePhase === "active_basho") {
      activePhases.push(...bashoPipeline);
    } else {
      activePhases.push(...offSeasonPipeline);
      if (boundaries.yearBoundary) {
        activePhases.push(phases.phase06_yearly_boundary);
      }
    }
  }

  if (boundaries.monthBoundary) {
    activePhases.push(phases.phase05_monthly_boundary);
  }

  nextWorld = runPipeline(nextWorld, activePhases);

  // 5. Update Weekly Tick Counter purely
  nextWorld = {
    ...nextWorld,
    _daysSinceLastWeeklyTick: isWeeklyTick ? 0 : daysSinceTick,
  };

  // 6. Finalize report in transient context
  nextWorld = {
    ...nextWorld,
    transientContext: {
      ...nextWorld.transientContext,
      lastReport: buildDailyReport(nextWorld, isWeeklyTick),
    },
  };

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
export function advanceDays(world: WorldState, days: number): WorldState {
  let currentWorld = world;
  if (days > MAX_DAYS_ADVANCE) {
    console.warn(
      `[advanceDays] Input ${days} exceeds MAX_DAYS_ADVANCE (${MAX_DAYS_ADVANCE}); capping.`
    );
  }
  const n = Math.max(1, Math.min(days, MAX_DAYS_ADVANCE));
  for (let i = 0; i < n; i++) {
    currentWorld = advanceOneDay(currentWorld);
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
export function advanceDaysFast(world: WorldState, days: number): WorldState {
  let currentWorld = world;
  if (days > MAX_DAYS_ADVANCE) {
    console.warn(
      `[advanceDaysFast] Input ${days} exceeds MAX_DAYS_ADVANCE (${MAX_DAYS_ADVANCE}); capping.`
    );
  }
  const n = Math.max(1, Math.min(days, MAX_DAYS_ADVANCE));
  for (let i = 0; i < n; i++) {
    currentWorld = advanceOneDay(currentWorld, { skipDailyMicroPhases: true });
  }
  return currentWorld;
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
