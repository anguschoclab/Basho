// timeBoundary.ts
// =======================================================
// Time Boundary Orchestrator — explicit interim weekly tick ordering.
//
// Canon goals:
// - One authoritative ordering for interim (between-basho) simulation steps.
// - Deterministic: each subsystem derives its RNG from world.seed.
// - Produces structured "boundary events" that UI can digest later.
// =======================================================

import type { WorldState } from "./types";
import * as scouting from "./scouting";
import * as training from "./training";
import * as injuries from "./injuries";
import * as welfare from "./welfare";
import * as economics from "./economics";
import * as governance from "./governance";
import * as events from "./events";
import * as rivalries from "./rivalries";

export interface BoundaryTickReport {
  weekIndex: number;
  scoutingEvents: number;
  injuriesRecovered: number;
  injuriesNew: number;
  welfareEvents: number;
  economyEvents: number;
  governanceRulings: number;
  narrativeEvents: number;
  rivalryEvents: number;
}

export interface TimeState {
  year: number;
  month: number;
  week: number;
  dayIndexGlobal: number;
  weekIndexGlobal: number;
  phase: "basho" | "interbasho" | "prebasho";
}

/**
 * tickWeek(world)
 * Explicit interim ordering (v1):
 *  1) scouting updates
 *  2) training progression
 *  3) injury recovery + injury rolls (if modeled)
 *  4) economy tick
 *  5) governance tick
 *  6) narrative events tick
 *  7) rivalry updates
 */
export function tickWeek(world: WorldState): BoundaryTickReport {
  const weekIndex = world.week ?? 0;

  // 1) Scouting
  const scoutingEvents = (scouting as any).tickWeek?.(world) ?? 0;

  // 2) Training
  (training as any).tickWeek?.(world);

  // 3) Injuries (recovery/rolls)
  const injReport = (injuries as any).tickWeek?.(world) ?? null;
  const injuriesRecovered = typeof injReport?.recoveredCount === "number" ? injReport.recoveredCount : 0;
  const injuriesNew = typeof injReport?.newCount === "number" ? injReport.newCount : 0;

  // 4) Welfare / Compliance
  const welfareEvents = (welfare as any).tickWeek?.(world) ?? 0;

  // 5) Economy
  const econEvents = (economics as any).tickWeek?.(world) ?? 0;

  // 6) Governance
  const govEvents = (governance as any).tickWeek?.(world) ?? 0;

  // 7) Narrative events
  const narrativeEvents = (events as any).tickWeek?.(world) ?? 0;

  // 8) Rivalries
  const rivalryEvents = (rivalries as any).tickWeek?.(world) ?? 0;

  return {
    weekIndex,
    scoutingEvents: Number(scoutingEvents) || 0,
    injuriesRecovered,
    injuriesNew,
    welfareEvents: Number(welfareEvents) || 0,
    economyEvents: Number(econEvents) || 0,
    governanceRulings: Number(govEvents) || 0,
    narrativeEvents: Number(narrativeEvents) || 0,
    rivalryEvents: Number(rivalryEvents) || 0,
  };
}

/**
 * advanceWeeks - Advance world state by N weeks
 */
export function advanceWeeks(world: WorldState, weeks: number): BoundaryTickReport[] {
  const reports: BoundaryTickReport[] = [];
  for (let i = 0; i < weeks; i++) {
    world.week = (world.week ?? 0) + 1;
    const report = tickWeek(world);
    reports.push(report);
  }
  return reports;
}

/**
 * processWeeklyBoundary - Called at week boundaries
 */
export function processWeeklyBoundary(world: WorldState, timeState: TimeState): BoundaryTickReport {
  return tickWeek(world);
}

/**
 * processMonthlyBoundary - Called at month boundaries (optional additional processing)
 */
export function processMonthlyBoundary(world: WorldState, timeState: TimeState): void {
  // Monthly processing hooks - currently a pass-through
  // Can be extended for monthly reports, financial summaries, etc.
}
