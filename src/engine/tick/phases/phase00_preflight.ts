/**
 * phase00_preflight.ts
 * ====================
 * Pipeline Phase 0 — Calendar advancement and Phase Transitions.
 */

import type { WorldState, CyclePhase } from "../../types/world";
import { createImpactBuilder, ImpactBuilder } from "../../core/ImpactBuilder";
import type { StateImpact } from "../../core/StateImpact";
import { info } from "../../utils/Logger";
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
import {
  evaluatePendingDecisions,
  applyExpiredQueueDefaults,
  autonomouslyResolveDecisions,
} from "../../loop/LoopDecisionEngine";

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
  const currentWeek = calendar.currentWeek;

  // Use ImpactBuilder for world field updates
  builder.updateWorldField("dayIndexGlobal", dayIndexGlobal);
  builder.updateWorldField("_interimDaysRemaining", _interimDaysRemaining);
  builder.updateWorldField("_postBashoDays", _postBashoDays);
  builder.updateWorldField("calendar", calendar);
  builder.updateWorldField("week", currentWeek);

  // Store boundaries and fresh working context in transient context for the pipeline
  // Accumulate pending boundaries from previous tick (for deferred boundary execution)
  const prevPendingMonth = world.transientContext?.pendingMonthBoundary ?? false;
  const prevPendingYear = world.transientContext?.pendingYearBoundary ?? false;
  builder.updateWorldField("transientContext", {
    ...world.transientContext,
    boundaries: { monthBoundary, yearBoundary },
    pendingMonthBoundary: prevPendingMonth || monthBoundary,
    pendingYearBoundary: prevPendingYear || yearBoundary,
    deltas: emptyDeltas(),
    activeModifiers: defaultActiveModifiers(),
  });

  // 4. Check Phase Transitions
  const transition = checkPhaseTransition(world, builder);
  if (transition) {
    // Transition logs are handled inside checkPhaseTransition for now to keep it consolidated
  }

  // 5/6. Loop decisions: auto-resolve in autonomous runs, otherwise surface for the player.
  if (world._autonomousSim) {
    builder.merge(autonomouslyResolveDecisions(world, world._autonomousPolicy ?? "balanced"));
  } else {
    builder.merge(evaluatePendingDecisions(world));
    builder.merge(applyExpiredQueueDefaults(world));
  }

  // 7. Clear caches for the new day
  clearQueryCaches();

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
        builder.logEvent(
          "PHASE_TRANSITION",
          "misc",
          { from: prev, to: nextPhase, basho: bashoName },
          { importance: "minor" }
        );

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

function logTransition(world: WorldState, from: CyclePhase, to: CyclePhase, summary: string) {
  info(`Phase transition: ${from} → ${to} — ${summary}`, "Pipeline", {
    dayIndexGlobal: world.dayIndexGlobal,
    year: world.calendar?.year,
    month: world.calendar?.month,
  });
}
