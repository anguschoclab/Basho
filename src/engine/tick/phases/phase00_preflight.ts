/**
 * phase00_preflight.ts
 * ====================
 * Pipeline Phase 0 — Calendar advancement and Phase Transitions.
 */

import type { WorldState, CyclePhase } from "../../types/world";
import { createImpactBuilder, ImpactBuilder } from "../../core/ImpactBuilder";
import type { StateImpact } from "../../core/StateImpact";
import { assertNever } from "../../utils/types";
import { initializeBasho } from "../../systems/generation/WorldFactory";
import { resetBashoMediaTracking } from "../../systems/media/MediaService";
import { getInterimWeeks } from "../../calendar";
import { emptyDeltas, defaultActiveModifiers } from "../pipelineRunner";
import { clearQueryCaches } from "../../queries";
import {
  DAYS_IN_MONTH,
  DEFAULT_MAX_DAY,
  MAX_MONTH,
  INTERIM_WARNING_THRESHOLD,
} from "../../../constants/engine/calendarExtended";

export function phase00_preflight(world: WorldState): StateImpact {
  const builder = createImpactBuilder("phase00_preflight");

  // 1. Shallow clone for base properties
  const dayIndexGlobal = (world.dayIndexGlobal ?? 0) + 1;
  const _interimDaysRemaining =
    world._interimDaysRemaining != null
      ? world._interimDaysRemaining - 1
      : world._interimDaysRemaining;
  const _postBashoDays =
    world._postBashoDays != null ? world._postBashoDays - 1 : world._postBashoDays;

  // 2. Advance calendar (day) - Purely
  const { calendar, monthBoundary, yearBoundary } = advanceCalendarDay(world);

  // Clear memoization caches when week changes
  const currentWeek = calendar.currentWeek;
  if (currentWeek !== world.week) {
    clearQueryCaches();
  }

  // Use ImpactBuilder for world field updates
  builder.updateWorldField("dayIndexGlobal", dayIndexGlobal);
  builder.updateWorldField("_interimDaysRemaining", _interimDaysRemaining);
  builder.updateWorldField("_postBashoDays", _postBashoDays);
  builder.updateWorldField("calendar", calendar);
  builder.updateWorldField("week", currentWeek);

  // Store boundaries and fresh working context in transient context for the pipeline
  // Note: transientContext updates are not directly supported by ImpactBuilder yet
  // For now, we'll update them directly as transientContext is a nested state
  world.transientContext = {
    ...world.transientContext,
    boundaries: { monthBoundary, yearBoundary },
    deltas: emptyDeltas(),
    activeModifiers: defaultActiveModifiers(),
  };

  // 4. Check Phase Transitions
  const transition = checkPhaseTransition(world, builder);
  if (transition) {
    // Transition logs are handled inside checkPhaseTransition for now to keep it consolidated
  }

  return builder.build();
}

function advanceCalendarDay(world: WorldState): {
  calendar: { currentWeek: number; year: number; month: number; week: number; currentDay: number };
  monthBoundary: boolean;
  yearBoundary: boolean;
} {
  const cal = {
    currentWeek: world.calendar?.currentWeek ?? 1,
    year: world.calendar?.year ?? 2026,
    month: world.calendar?.month ?? 1,
    week: world.calendar?.week ?? 1,
    currentDay: world.calendar?.currentDay ?? 1,
  };

  let monthBoundary = false;
  let yearBoundary = false;

  cal.currentDay = cal.currentDay + 1;
  const maxDay = DAYS_IN_MONTH[(cal.month - 1) % MAX_MONTH] || DEFAULT_MAX_DAY;

  if (cal.currentDay > maxDay) {
    cal.currentDay = 1;
    cal.month += 1;
    monthBoundary = true;
    if (cal.month > MAX_MONTH) {
      cal.month = 1;
      cal.year += 1;
      yearBoundary = true;
    }
  }

  return { calendar: cal, monthBoundary, yearBoundary };
}

function checkPhaseTransition(
  world: WorldState,
  builder: ImpactBuilder
): { from: CyclePhase; to: CyclePhase } | undefined {
  const prev = world.cyclePhase;

  switch (world.cyclePhase) {
    case "pre_basho": {
      if ((world._interimDaysRemaining ?? 0) <= 0) {
        const bashoName = world.currentBashoName || "hatsu";
        const basho = initializeBasho(world, bashoName);

        const nextPhase: CyclePhase = "active_basho";
        builder.updateWorldField("cyclePhase", nextPhase);
        builder.updateWorldField("currentBasho", basho);

        if (world.mediaState) {
          const resetMedia = resetBashoMediaTracking(world.mediaState);
          builder.updateWorldField("mediaState", resetMedia);
        }
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
        builder.updateWorldField("cyclePhase", nextPhase);
        builder.updateWorldField("_interimDaysRemaining", getInterimWeeks("hatsu", "haru") * 7 - 7);
        logTransition(world, prev, nextPhase, "The inter-basho period begins.");
        return { from: prev, to: nextPhase };
      }
      break;
    }
    case "interim": {
      if ((world._interimDaysRemaining ?? 0) <= INTERIM_WARNING_THRESHOLD) {
        const nextPhase: CyclePhase = "banzuke_reveal";
        builder.updateWorldField("cyclePhase", nextPhase);
        logTransition(world, prev, nextPhase, "The official banzuke has been published.");
        return { from: prev, to: nextPhase };
      }
      break;
    }
    case "banzuke_reveal": {
      if ((world._interimDaysRemaining ?? 0) <= 7) {
        const nextPhase: CyclePhase = "pre_basho";
        builder.updateWorldField("cyclePhase", nextPhase);
        logTransition(world, prev, nextPhase, "Final preparations for the upcoming basho begin.");
        return { from: prev, to: nextPhase };
      }
      break;
    }
    case "active_basho": {
      // Logic for active_basho transition if any, usually handled outside or no-op here
      break;
    }
    default:
      assertNever(world.cyclePhase);
  }
  return undefined;
}

function logTransition(_world: WorldState, from: CyclePhase, to: CyclePhase, summary: string) {
  // Note: EventBus replaced - transition logging skipped for now
  // This is a low-priority event that can be added later
  console.log(`[PhaseTransition] ${from} -> ${to}: ${summary}`);
}
