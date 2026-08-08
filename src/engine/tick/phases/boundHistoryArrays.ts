/**
 * boundHistoryArrays.ts
 * ======================
 * Caps world.history and world.awardLog at a rolling window to prevent
 * unbounded growth across 25-year simulations (B2.5).
 */

import type { WorldState } from "../../types/world";

/** Maximum number of basho results to retain in world.history. */
export const HISTORY_MAX_ENTRIES = 500;

/**
 * Returns a new WorldState with history and awardLog capped to the most recent
 * HISTORY_MAX_ENTRIES. If arrays are under the cap, returns the original world
 * unchanged (no allocation).
 */
export function boundHistoryArrays(world: WorldState): WorldState {
  const historyLen = world.history?.length ?? 0;
  const awardLogLen = world.awardLog?.length ?? 0;

  if (historyLen <= HISTORY_MAX_ENTRIES && awardLogLen <= HISTORY_MAX_ENTRIES) {
    return world;
  }

  const updates: Partial<WorldState> = {};

  if (historyLen > HISTORY_MAX_ENTRIES) {
    updates.history = world.history.slice(historyLen - HISTORY_MAX_ENTRIES);
  }

  if (awardLogLen > HISTORY_MAX_ENTRIES && world.awardLog) {
    updates.awardLog = world.awardLog.slice(awardLogLen - HISTORY_MAX_ENTRIES);
  }

  return { ...world, ...updates };
}
