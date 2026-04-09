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

export function phase00_preflight(world: WorldState): WorldState {
  const nextWorld = { ...world };

  // 1. Advance global day index
  nextWorld.dayIndexGlobal = (world.dayIndexGlobal ?? 0) + 1;

  // 2. Advance calendar (day)
  const { monthBoundary, yearBoundary } = advanceCalendarDay(nextWorld);
  
  // Store boundaries in transient context for later phases to see
  nextWorld.transientContext = {
    ...world.transientContext,
    boundaries: { monthBoundary, yearBoundary }
  } as any;

  // 3. Decrement phase counters
  if (nextWorld._interimDaysRemaining != null) nextWorld._interimDaysRemaining -= 1;
  if (nextWorld._postBashoDays != null) nextWorld._postBashoDays -= 1;

  // 4. Check Phase Transitions
  const transition = checkPhaseTransition(nextWorld);
  if (transition) {
    // Transition logs are handled inside checkPhaseTransition for now to keep it consolidated
  }

  return nextWorld;
}

function advanceCalendarDay(world: WorldState): { monthBoundary: boolean; yearBoundary: boolean } {
  const cal = world.calendar;
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

  return { monthBoundary, yearBoundary };
}

function checkPhaseTransition(world: WorldState): { from: CyclePhase; to: CyclePhase } | undefined {
  const prev = world.cyclePhase;

  switch (world.cyclePhase) {
    case "pre_basho": {
      if ((world._interimDaysRemaining ?? 0) <= 0) {
        const bashoName = world.currentBashoName || "hatsu";
        const basho = initializeBasho(world, bashoName);
        world.currentBasho = basho;
        world.cyclePhase = "active_basho";

        if (world.mediaState) world.mediaState = resetBashoMediaTracking(world.mediaState);
        EventBus.bashoStarted(world, bashoName);
        
        logTransition(world, prev, world.cyclePhase, `The ${bashoName} basho begins!`);
        return { from: prev, to: world.cyclePhase };
      }
      break;
    }
    case "post_basho": {
      if ((world._postBashoDays ?? 0) <= 0) {
        world.cyclePhase = "interim";
        world._interimDaysRemaining = getInterimWeeks("hatsu", "haru") * 7 - 7;
        logTransition(world, prev, world.cyclePhase, "The inter-basho period begins.");
        return { from: prev, to: world.cyclePhase };
      }
      break;
    }
    case "interim": {
      if ((world._interimDaysRemaining ?? 0) <= 14) {
        world.cyclePhase = "banzuke_reveal";
        logTransition(world, prev, world.cyclePhase, "The official banzuke has been published.");
        return { from: prev, to: world.cyclePhase };
      }
      break;
    }
    case "banzuke_reveal": {
      if ((world._interimDaysRemaining ?? 0) <= 7) {
        world.cyclePhase = "pre_basho";
        logTransition(world, prev, world.cyclePhase, "Final preparations for the upcoming basho begin.");
        return { from: prev, to: world.cyclePhase };
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
