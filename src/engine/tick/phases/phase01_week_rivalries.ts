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
import { type RivalryPairState } from "../../../constants/engine/rivalry";
import { deriveTone } from "../../systems/narrative/RivalryHeatService";
import { clamp } from "../../utils/math";
import { ensureEventsState } from "../../events";
import {
  WEEKS_PER_YEAR,
  MAX_EVENT_AGE_WEEKS,
  RIVALRY_DECAY_THRESHOLDS,
  RIVALRY_DECAY_RATES,
  RIVALRY_PRUNING,
} from "../../../constants/engine/time";
import {
  MAX_RIVALRY_HEAT,
  MAX_RIVALRY_CLOSENESS,
  MAX_RIVALRY_SPITE,
} from "../../../constants/engine/bout";

export function phase01_week_rivalries(world: WorldState): StateImpact {
  const builder = createImpactBuilder("phase01_week_rivalries");

  // 1. Rivalry Decay
  if (world.rivalriesState) {
    const nextPairs: Record<string, RivalryPairState> = {};
    const week = world.calendar.currentWeek || 0;
    const currentPairs = world.rivalriesState.pairs || {};

    // ⚡ Bolt Optimization: Use a direct for...in loop instead of Object.entries()
    // This avoids O(N) tuple allocations per tick for thousands of rivalry pairs
    for (const key in currentPairs) {
      if (!Object.prototype.hasOwnProperty.call(currentPairs, key)) continue;
      const pair = currentPairs[key];
      const weeksSince = week - (pair.lastMetWeek || 0);

      // Skip decay for already cold pairs (optimization)
      const isCold =
        pair.heat < RIVALRY_PRUNING.MIN_HEAT &&
        pair.meetings < RIVALRY_PRUNING.MIN_MEETINGS &&
        weeksSince > RIVALRY_DECAY_THRESHOLDS.LONG_TERM;
      if (isCold) continue;

      const nextPair = { ...pair };
      const decay =
        weeksSince <= RIVALRY_DECAY_THRESHOLDS.SHORT_TERM
          ? RIVALRY_DECAY_RATES.HEAT.SHORT
          : weeksSince <= RIVALRY_DECAY_THRESHOLDS.MEDIUM_TERM
            ? RIVALRY_DECAY_RATES.HEAT.MEDIUM
            : RIVALRY_DECAY_RATES.HEAT.LONG;

      nextPair.heat = clamp(nextPair.heat - decay, 0, MAX_RIVALRY_HEAT);
      nextPair.closeness = clamp(
        nextPair.closeness - RIVALRY_DECAY_RATES.CLOSENESS,
        0,
        MAX_RIVALRY_CLOSENESS
      );
      nextPair.spite = clamp(nextPair.spite - RIVALRY_DECAY_RATES.SPITE, 0, MAX_RIVALRY_SPITE);
      nextPair.tone = deriveTone(nextPair);

      nextPairs[key] = nextPair;
    }

    // Note: rivalriesState updates are not directly supported by ImpactBuilder yet
    // For now, we'll update them directly as rivalriesState is a nested state
    world.rivalriesState = {
      ...world.rivalriesState,
      pairs: nextPairs,
    };
  }

  // 2. Event Log Trimming
  if (world.events) {
    const eventsState = { ...world.events };
    const currentYear = world.calendar?.year ?? world.year ?? DEFAULT_START_YEAR;
    const currentWeek = world.calendar?.currentWeek ?? world.week ?? 0;
    const currentTotalWeeks = currentYear * WEEKS_PER_YEAR + currentWeek;

    const targetWeeks = currentTotalWeeks - MAX_EVENT_AGE_WEEKS;
    const log = eventsState.log;

    // Find first recent event
    let left = 0;
    let right = log.length - 1;
    let firstRecentIndex = log.length;

    while (left <= right) {
      const mid = (left + right) >> 1;
      const ev = log[mid];
      const evTotalWeeks = ev.year * WEEKS_PER_YEAR + ev.week;

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
      log: newLog,
    };
  }

  return builder.build();
}
