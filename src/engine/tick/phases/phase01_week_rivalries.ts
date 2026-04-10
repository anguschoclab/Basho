/**
 * phase01_week_rivalries.ts
 * =========================
 * Pipeline Phase: Weekly Narrative Maintenance.
 * 
 * Responsibilities:
 * 1. Decay rivalry heat, closeness, and spite for all pairs.
 * 2. Prune cold and stale rivalries.
 * 3. Trim the global EngineEvent log to prevent memory leaks.
 */

import type { WorldState } from "../../types/world";
import { type RivalryPairState } from "../../systems/narrative/RivalryConstants";
import { deriveTone } from "../../systems/narrative/RivalryHeatService";
import { clamp } from "../../utils/math";
import { ensureEventsState } from "../../events";

export function phase01_week_rivalries(world: WorldState): WorldState {
  let nextWorld = { ...world };
  
  // 1. Rivalry Decay
  if (nextWorld.rivalriesState) {
    const nextPairs: Record<string, RivalryPairState> = {};
    const week = nextWorld.calendar.currentWeek || 0;

    for (const key in nextWorld.rivalriesState.pairs) {
      const pair = { ...nextWorld.rivalriesState.pairs[key] };
      const weeksSince = week - (pair.lastMetWeek || 0);
      const decay = weeksSince <= 4 ? 0.5 : weeksSince <= 12 ? 1.0 : 1.5;

      pair.heat = clamp(pair.heat - decay, 0, 100);
      pair.closeness = clamp(pair.closeness - 0.25, 0, 100);
      pair.spite = clamp(pair.spite - 0.35, 0, 100);
      pair.tone = deriveTone(pair);

      // Auto-cull cold rivalries
      const isCold = pair.heat < 5 && pair.meetings < 2 && weeksSince > 30;
      if (!isCold) {
        nextPairs[key] = pair;
      }
    }

    nextWorld.rivalriesState = {
      ...nextWorld.rivalriesState,
      pairs: nextPairs
    };
  }

  // 2. Event Log Trimming
  if (nextWorld.eventState) {
    const eventsState = { ...nextWorld.eventState };
    const currentYear = nextWorld.calendar?.year ?? nextWorld.year ?? 2025;
    const currentWeek = nextWorld.calendar?.currentWeek ?? nextWorld.week ?? 0;
    const MAX_AGE_WEEKS = 52;
    const currentTotalWeeks = currentYear * 52 + currentWeek;

    const newLog = eventsState.log.filter(ev => {
      const evTotalWeeks = ev.year * 52 + ev.week;
      const ageWeeks = currentTotalWeeks - evTotalWeeks;
      const isHeadline = ev.importance === "headline";
      const isCareerOrBasho = ev.category === "career" || ev.category === "basho";
      const isRecent = ageWeeks <= MAX_AGE_WEEKS;

      return isRecent || isHeadline || isCareerOrBasho;
    });

    // Note: Dedupe cleanup is harder without mutation, so we'll just return the log for now
    // or we can recreate the dedupe set.
    nextWorld.eventState = {
      ...eventsState,
      log: newLog
    };
  }

  return nextWorld;
}
