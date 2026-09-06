/**
 * boundHistoryArrays.ts
 * ======================
 * Caps world.history, world.awardLog, and world.almanacSnapshots at rolling
 * windows to prevent unbounded growth across 25-year simulations (B2.5).
 *
 * Older almanac snapshots are already written to cold storage at basho time
 * (see BashoHistory.ts → archiveBanzuke), so truncating the hot array does
 * not lose data — it only bounds the in-memory / in-save window.
 */

import type { WorldState } from "../../types/world";

/** Maximum number of basho results to retain in world.history. */
export const HISTORY_MAX_ENTRIES = 500;

/**
 * Maximum number of almanac snapshots to retain in world.almanacSnapshots.
 * One year = 6 bashos, so 6 snapshots ≈ one year of hot almanac data.
 * Older snapshots remain in cold storage (archiveBanzuke) for on-demand access.
 */
export const ALMANAC_SNAPSHOTS_MAX = 6;

/**
 * Returns a new WorldState with history, awardLog, and almanacSnapshots capped
 * to their respective rolling windows. If all arrays are under their caps,
 * returns the original world unchanged (no allocation).
 */
export function boundHistoryArrays(world: WorldState): WorldState {
  const historyLen = world.history?.length ?? 0;
  const awardLogLen = world.awardLog?.length ?? 0;
  const almanacLen = world.almanacSnapshots?.length ?? 0;

  if (
    historyLen <= HISTORY_MAX_ENTRIES &&
    awardLogLen <= HISTORY_MAX_ENTRIES &&
    almanacLen <= ALMANAC_SNAPSHOTS_MAX
  ) {
    return world;
  }

  const updates: Partial<WorldState> = {};

  if (historyLen > HISTORY_MAX_ENTRIES) {
    updates.history = world.history.slice(historyLen - HISTORY_MAX_ENTRIES);
  }

  if (awardLogLen > HISTORY_MAX_ENTRIES && world.awardLog) {
    updates.awardLog = world.awardLog.slice(awardLogLen - HISTORY_MAX_ENTRIES);
  }

  if (almanacLen > ALMANAC_SNAPSHOTS_MAX && world.almanacSnapshots) {
    updates.almanacSnapshots = world.almanacSnapshots.slice(almanacLen - ALMANAC_SNAPSHOTS_MAX);
  }

  return { ...world, ...updates };
}
