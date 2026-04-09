/**
 * phase00_preflight.ts
 * ====================
 * Pipeline Phase 0 — Calendar advancement and Phase Transitions.
 */

import type { WorldState, CyclePhase } from "../../types/world";
import { initializeBasho } from "../../systems/generation/WorldFactory";
import { resetBashoMediaTracking } from "../../systems/media/MediaService";
import { EventBus, logEngineEvent } from "../../events";
import { getInterimWeeks } from "../../calendar";
import { rngFromSeed } from "../../rng";
import { BardEngine } from "../../narrative/BardEngine";
import * as schedule from "../../schedule";
import { emptyDeltas, defaultActiveModifiers } from "../pipelineRunner";

export function phase00_preflight(world: WorldState): WorldState {
  // 1. Shallow clone for base properties
  const nextWorld: WorldState = { 
    ...world,
    dayIndexGlobal: (world.dayIndexGlobal ?? 0) + 1,
    // 2. Decrement phase counters (cloned)
    _interimDaysRemaining: world._interimDaysRemaining != null ? world._interimDaysRemaining - 1 : world._interimDaysRemaining,
    _postBashoDays: world._postBashoDays != null ? world._postBashoDays - 1 : world._postBashoDays,
  };

  // 3. Advance calendar (day) - Purely
  const { calendar, monthBoundary, yearBoundary } = advanceCalendarDay(world);
  nextWorld.calendar = calendar;
  
  // Store boundaries and fresh working context in transient context for the pipeline
  nextWorld.transientContext = {
    ...world.transientContext,
    boundaries: { monthBoundary, yearBoundary },
    deltas: emptyDeltas(),
    modifiers: defaultActiveModifiers()
  } as any;

  // 4. Check Phase Transitions
  const transition = checkPhaseTransition(nextWorld);
  if (transition) {
    // Transition logs are handled inside checkPhaseTransition for now to keep it consolidated
  }

  return nextWorld;
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
        EventBus.bashoStarted(world, bashoName);
        
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
  const rng = rngFromSeed(`phase-start-${world.dayIndexGlobal}`, "narrative", "event");
  logEngineEvent(world, {
    type: "PHASE_TRANSITION",
    category: "basho",
    importance: "major",
    scope: "world",
    title: BardEngine.resolve(rng, "events.titles.PHASE_TRANSITION").text,
    summary,
    data: { from, to },
    tags: ["phase"]
  });
}
