// timeBoundary.ts
// =======================================================
// Time Boundary Orchestrator — explicit interim weekly tick ordering.
//
// Canon goals:
// - One authoritative ordering for interim (between-basho) simulation steps.
// - Deterministic: each subsystem derives its RNG from world.seed.
// - Produces structured "boundary events" that UI can digest later.
//
// NOTE: The primary tick pipeline is dailyTick.ts (advanceOneDay).
// This module provides the legacy tickWeek/advanceWeeks interface
// used by some consumers.
// =======================================================

import type { WorldState } from "./types";
import * as scouting from "./scoutingStore";
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
 *  3) injury recovery + injury rolls
 *  4) welfare / compliance
 *  5) economy tick
 *  6) governance tick
 *  7) narrative events tick
 *  8) rivalry updates
 */
export function tickWeek(world: WorldState): BoundaryTickReport {
  const weekIndex = world.week ?? 0;

  // 1) Scouting
  scouting.tickWeek(world);
  const scoutingEvents = 0;

  // 2) Training
  training.tickWeek(world);

  // 3) Injuries (recovery/rolls)
  const injReport = injuries.tickWeek(world);
  const injuriesRecovered = injReport?.recoveredCount ?? 0;
  const injuriesNew = injReport?.newCount ?? 0;

  // 4) Welfare / Compliance
  const welfareEvents = welfare.tickWeek(world) ?? 0;

  // 5) Economy
  economics.tickWeek(world);
  const econEvents = 0;

  // 6) Governance
  governance.tickWeek(world);
  const govEvents = 0;

  // 7) Narrative events
  const narrativeEvents = events.tickWeek(world) ?? 0;

  // 8) Rivalries
  rivalries.tickWeek(world);
  const rivalryEvents = 0;

  return {
    weekIndex,
    scoutingEvents,
    injuriesRecovered,
    injuriesNew,
    welfareEvents,
    economyEvents: econEvents,
    governanceRulings: govEvents,
    narrativeEvents,
    rivalryEvents,
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
export function processWeeklyBoundary(world: WorldState, _timeState: TimeState): BoundaryTickReport {
  return tickWeek(world);
}

/**
 * processMonthlyBoundary - Called at month boundaries (optional additional processing)
 */
export function processMonthlyBoundary(world: WorldState, _timeState: TimeState): void {
  // Monthly processing hooks - currently a pass-through
}
