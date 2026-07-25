// MediaStateService.ts — Media state management utilities.
// Handles createDefaultMediaState, resetBashoMediaTracking,
// snapshotMediaHeatForBasho, and processWeeklyMediaBoundary.

import type { WorldState } from "../../types/world";
import { MediaState } from "../../types/media";
import { decayHeat, decayPressure } from "./MediaImpactService";
import { createImpactBuilder } from "../../core/ImpactBuilder";
import type { StateImpact } from "../../core/StateImpact";

/**
 * Creates a default media state.
 */
export function createDefaultMediaState(): MediaState {
  return {
    version: "1.0.0",
    headlines: [],
    mediaHeat: {},
    mediaHeatHistory: {},
    heyaPressure: {},
    bashoStreaks: {},
    streakHeadlinesFired: {},
    promoWatchFired: {},
    retirementWatchFired: {},
    titleRaceDayFired: {},
    injuryWithdrawalFired: {},
    absenceAnnouncements: [],
  };
}

/**
 * Reset basho-scoped tracking state.
 */
export function resetBashoMediaTracking(state: MediaState): MediaState {
  return {
    ...state,
    bashoStreaks: {},
    streakHeadlinesFired: {},
    promoWatchFired: {},
    retirementWatchFired: {},
    titleRaceDayFired: {},
    injuryWithdrawalFired: {},
  };
}

/**
 * Snapshot current media heat values for history.
 */
export function snapshotMediaHeatForBasho(state: MediaState, bashoName: string): MediaState {
  const nextHistory = { ...state.mediaHeatHistory };

  for (const id in state.mediaHeat) {
    if (!Object.prototype.hasOwnProperty.call(state.mediaHeat, id)) continue;
    const heat = state.mediaHeat[id];
    const history = [...(nextHistory[id] || [])];
    // Avoid duplicate snapshots for the same basho if called multiple times
    const lastEntry = history[history.length - 1];
    if (lastEntry && lastEntry.basho === bashoName) {
      history[history.length - 1] = { ...lastEntry, heat };
    } else {
      history.push({ basho: bashoName, heat });
    }
    nextHistory[id] = history.slice(-10); // Keep last 10 snapshots
  }

  return {
    ...state,
    mediaHeatHistory: nextHistory,
  };
}

/**
 * Weekly media boundary: decay heat/pressure and rotate headlines.
 * Returns StateImpact describing media boundary updates instead of mutating state directly.
 */
export function processWeeklyMediaBoundary(world: WorldState): StateImpact {
  const builder = createImpactBuilder("processWeeklyMediaBoundary");

  if (!world.mediaState) return builder.build();

  const state = world.mediaState;
  const nextHeat: Record<string, number> = {};
  for (const id in state.mediaHeat) {
    if (!Object.prototype.hasOwnProperty.call(state.mediaHeat, id)) continue;
    const nv = decayHeat(state.mediaHeat[id] as number);
    if (nv > 0) nextHeat[id] = nv;
  }

  const nextPressure: Record<string, number> = {};
  for (const id in state.heyaPressure) {
    if (!Object.prototype.hasOwnProperty.call(state.heyaPressure, id)) continue;
    const nv = decayPressure(state.heyaPressure[id] as number);
    if (nv > 0) nextPressure[id] = nv;
  }

  builder.updateWorldField("mediaState", {
    ...state,
    mediaHeat: nextHeat,
    heyaPressure: nextPressure,
  });

  return builder.build();
}
