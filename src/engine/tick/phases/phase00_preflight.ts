/**
 * phase00_preflight.ts
 * ====================
 * Pipeline Phase 0 — Calendar advancement and Phase Transitions.
 */

import type { WorldState, CyclePhase } from "../../types/world";
import { createImpactBuilder } from "../../core/ImpactBuilder";
import type { StateImpact } from "../../core/StateImpact";
import { initializeBasho } from "../../systems/generation/WorldFactory";
import { resetBashoMediaTracking } from "../../systems/media/MediaService";
import { getInterimWeeks } from "../../calendar";
import { rngFromSeed } from "../../rng";
import { BardEngine } from "../../narrative/BardEngine";
import * as schedule from "../../schedule";
import { emptyDeltas, defaultActiveModifiers } from "../pipelineRunner";
import { clearQueryCaches } from "../../queries";

export function phase00_preflight(world: WorldState): StateImpact {
  const builder = createImpactBuilder('phase00_preflight');
  
  // 1. Shallow clone for base properties
  const dayIndexGlobal = (world.dayIndexGlobal ?? 0) + 1;
  const _interimDaysRemaining = world._interimDaysRemaining != null ? world._interimDaysRemaining - 1 : world._interimDaysRemaining;
  const _postBashoDays = world._postBashoDays != null ? world._postBashoDays - 1 : world._postBashoDays;

  // 2. Advance calendar (day) - Purely
  const { calendar, monthBoundary, yearBoundary } = advanceCalendarDay(world);
  
  // Clear memoization caches when week changes
  const currentWeek = calendar.currentWeek ?? world.week;
  if (currentWeek !== world.week) {
    clearQueryCaches();
  }
  
  // Store boundaries and fresh working context in transient context for the pipeline
  // Note: transientContext updates are not directly supported by ImpactBuilder yet
  // For now, we'll update them directly as transientContext is a nested state
  world.dayIndexGlobal = dayIndexGlobal;
  world._interimDaysRemaining = _interimDaysRemaining;
  world._postBashoDays = _postBashoDays;
  world.calendar = calendar;
  world.week = currentWeek;
  world.transientContext = {
    ...world.transientContext,
    boundaries: { monthBoundary, yearBoundary },
    deltas: emptyDeltas(),
    modifiers: defaultActiveModifiers()
  } as any;

  // 4. Check Phase Transitions
  const transition = checkPhaseTransition(world);
  if (transition) {
    // Transition logs are handled inside checkPhaseTransition for now to keep it consolidated
  }

  return builder.build();
}

function advanceCalendarDay(world: WorldState): { calendar: typeof world.calendar; monthBoundary: boolean; yearBoundary: boolean } {
  const cal = { ...world.calendar };
  const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  
  let monthBoundary = false;
  let yearBoundary = false;

  cal.currentDay = (cal.currentDay ?? 1) + 1;
  const maxDay = DAYS_IN_MONTH[(cal.month - 1) % 12] || 30;

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

  return { calendar: cal, monthBoundary, yearBoundary };
}

function checkPhaseTransition(world: WorldState): { from: CyclePhase; to: CyclePhase } | undefined {
  const prev = world.cyclePhase;

  switch (world.cyclePhase) {
    case "pre_basho": {
      if ((world._interimDaysRemaining ?? 0) <= 0) {
        const bashoName = world.currentBashoName || "hatsu";
        const basho = initializeBasho(world, bashoName);
        world.currentBasho = basho;
        
        const nextPhase: CyclePhase = "active_basho";
        world.cyclePhase = nextPhase;

        if (world.mediaState) world.mediaState = resetBashoMediaTracking(world.mediaState);
        // Note: EventBus replaced with logEvent - but this is a complex transition
        // For now, we'll skip the event log as it's a low-priority phase transition
        
        logTransition(world, prev, nextPhase, `The ${bashoName} basho begins!`);
        return { from: prev, to: nextPhase };
      }
      break;
    }
    case "post_basho": {
      if ((world._postBashoDays ?? 0) <= 0) {
        const nextPhase: CyclePhase = "interim";
        world.cyclePhase = nextPhase;
        world._interimDaysRemaining = getInterimWeeks("hatsu", "haru") * 7 - 7;
        logTransition(world, prev, nextPhase, "The inter-basho period begins.");
        return { from: prev, to: nextPhase };
      }
      break;
    }
    case "interim": {
      if ((world._interimDaysRemaining ?? 0) <= 14) {
        const nextPhase: CyclePhase = "banzuke_reveal";
        world.cyclePhase = nextPhase;
        logTransition(world, prev, nextPhase, "The official banzuke has been published.");
        return { from: prev, to: nextPhase };
      }
      break;
    }
    case "banzuke_reveal": {
      if ((world._interimDaysRemaining ?? 0) <= 7) {
        const nextPhase: CyclePhase = "pre_basho";
        world.cyclePhase = nextPhase;
        logTransition(world, prev, nextPhase, "Final preparations for the upcoming basho begin.");
        return { from: prev, to: nextPhase };
      }
      break;
    }
  }
  return undefined;
}

function logTransition(world: WorldState, from: CyclePhase, to: CyclePhase, summary: string) {
  // Note: EventBus replaced - transition logging skipped for now
  // This is a low-priority event that can be added later
  console.log(`[PhaseTransition] ${from} -> ${to}: ${summary}`);
}
