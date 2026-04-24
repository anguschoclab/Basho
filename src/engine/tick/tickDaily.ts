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
import { phase05_monthly_boundary } from "./phases/phase05_monthly_boundary";
import { phase06_yearly_boundary } from "./phases/phase06_yearly_boundary";
import { bashoPipeline } from "./pipelines/bashoPipeline";
import { offSeasonPipeline } from "./pipelines/offSeasonPipeline";

/**
 * AdvanceOneDay — the authoritative daily tick per Constitution A3.1.
 * Now fully migrated to the Strict Pipeline Architecture.
 */
export function advanceOneDay(world: WorldState): WorldState {
  // 1. Run Preflight to advance calendar and determine boundaries
  let nextWorld = runPipeline(world, [phases.phase00_preflight]);
  
  const boundaries = nextWorld.transientContext?.boundaries || {
    monthBoundary: false,
    yearBoundary: false,
  };

  const daysSinceTick = (nextWorld._daysSinceLastWeeklyTick ?? nextWorld.dayIndexGlobal % 7);
  const isWeeklyTick = daysSinceTick === 0; // Preflight just incremented it, so 0 means we hit 7

  // 2. Determine which phases to run
  const activePhases: import("./pipelineRunner").PipelinePhase[] = [
    phases.phase01_daily_economy,
    phases.phase01_daily_welfare,
    phases.phase01_daily_sponsors,
    phases.phase01_daily_drama,
    phases.phase01_monthly_market,
  ];

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
  nextWorld.transientContext = {
    ...nextWorld.transientContext,
    lastReport: buildDailyReport(nextWorld, isWeeklyTick),
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
 * Advance days.
 * @param world - The World.
 * @param days - The Days.
 * @returns The result.
 */
export function advanceDays(world: WorldState, days: number): WorldState {
  let currentWorld = world;
  const n = Math.max(1, Math.min(days, 365));
  for (let i = 0; i < n; i++) {
    currentWorld = advanceOneDay(currentWorld);
  }
  return currentWorld;
}

/**
 * Advance full interim.
 * @param world - The World.
 * @returns The result.
 */
export function advanceFullInterim(world: WorldState): WorldState {
  if (world.cyclePhase !== "interim" && world.cyclePhase !== "pre_basho") return world;
  // This would advance until phase transition, but for simplicity we advance by remaining days
  return advanceDays(world, world._interimDaysRemaining ?? 0);
}

// ====
// PHASE INITIALIZERS (called by world.ts on phase entry)
// ====

/**
 * Enter post basho. Returns a new WorldState.
 */
export function enterPostBasho(world: WorldState): WorldState {
  return {
    ...world,
    cyclePhase: "post_basho",
    _postBashoDays: 7,
  };
}

/**
 * Enter interim. Returns a new WorldState.
 */
export function enterInterim(world: WorldState): WorldState {
  return {
    ...world,
    cyclePhase: "interim",
    _interimDaysRemaining: 42, // Standard 6-week interim
  };
}