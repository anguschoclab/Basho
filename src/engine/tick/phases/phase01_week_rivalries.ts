// @ts-nocheck
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
import { createImpactBuilder } from "../../core/ImpactBuilder";
import type { StateImpact } from "../../core/StateImpact";
import { type RivalryPairState } from "../../systems/narrative/RivalryConstants";
import { deriveTone } from "../../systems/narrative/RivalryHeatService";
import { clamp } from "../../utils/math";
import { ensureEventsState } from "../../events";

export function phase01_week_rivalries(world: WorldState): StateImpact {
  const builder = createImpactBuilder('phase01_week_rivalries');
  
  // 1. Rivalry Decay
  if (world.rivalriesState) {
    const nextPairs: Record<string, RivalryPairState> = {};
    const week = world.calendar.currentWeek || 0;

    for (const [key, pair] of Object.entries(world.rivalriesState.pairs || {})) {
      const weeksSince = week - (pair.lastMetWeek || 0);
      
      // Skip decay for already cold pairs (optimization)
      const isCold = pair.heat < 5 && pair.meetings < 2 && weeksSince > 30;
      if (isCold) continue;

      const nextPair = { ...pair };
      const decay = weeksSince <= 4 ? 0.5 : weeksSince <= 12 ? 1.0 : 1.5;

      nextPair.heat = clamp(nextPair.heat - decay, 0, 100);
      nextPair.closeness = clamp(nextPair.closeness - 0.25, 0, 100);
      nextPair.spite = clamp(nextPair.spite - 0.35, 0, 100);
      nextPair.tone = deriveTone(nextPair);

      nextPairs[key] = nextPair;
    }

    // Note: rivalriesState updates are not directly supported by ImpactBuilder yet
    // For now, we'll update them directly as rivalriesState is a nested state
    world.rivalriesState = {
      ...world.rivalriesState,
      pairs: nextPairs
    };
  }

  // 2. Event Log Trimming
  if (world.events) {
    const eventsState = { ...world.events };
    const currentYear = world.calendar?.year ?? world.year ?? 2025;
    const currentWeek = world.calendar?.currentWeek ?? world.week ?? 0;
    const MAX_AGE_WEEKS = 52;
    const currentTotalWeeks = currentYear * 52 + currentWeek;

    const targetWeeks = currentTotalWeeks - MAX_AGE_WEEKS;
    const log = eventsState.log;

    // Find first recent event
    let left = 0;
    let right = log.length - 1;
    let firstRecentIndex = log.length;

    while (left <= right) {
      const mid = (left + right) >> 1;
      const ev = log[mid];
      const evTotalWeeks = ev.year * 52 + ev.week;

      if (evTotalWeeks >= targetWeeks) {
        firstRecentIndex = mid;
        right = mid - 1;
      } else {
        left = mid + 1;
      }
    }

    // Iterate forward over stale events to see if any need removal
    let needsTrim = false;
    let firstIndexToRemove = -1;

    for (let i = 0; i < firstRecentIndex; i++) {
      const ev = log[i];
      if (ev.importance !== "headline" && ev.category !== "career" && ev.category !== "basho") {
        needsTrim = true;
        firstIndexToRemove = i;
        break;
      }
    }

    let newLog;
    if (!needsTrim) {
      newLog = log;
    } else {
      newLog = [];

      // Keep everything before the first removed event
      for (let i = 0; i < firstIndexToRemove; i++) {
        newLog.push(log[i]);
      }

      // Filter the remaining stale events
      for (let i = firstIndexToRemove + 1; i < firstRecentIndex; i++) {
        const ev = log[i];
        if (ev.importance === "headline" || ev.category === "career" || ev.category === "basho") {
          newLog.push(ev);
        }
      }

      // Keep all recent events
      for (let i = firstRecentIndex; i < log.length; i++) {
        newLog.push(log[i]);
      }
    }

    // Note: Dedupe cleanup is harder without mutation, so we'll just return the log for now
    // or we can recreate the dedupe set.
    // Note: events updates are not directly supported by ImpactBuilder yet
    // For now, we'll update them directly as events is a nested state
    world.events = {
      ...eventsState,
      log: newLog
    };
  }

  return builder.build();
}