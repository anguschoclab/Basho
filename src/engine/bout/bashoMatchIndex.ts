/**
 * bashoMatchIndex.ts
 * ==================
 * Pre-indexes basho matches by day for O(1) lookup.
 *
 * Replaces repeated `matches.filter(m => m.day === day)` calls
 * in phase01_basho_bouts, bashoSlice, and gameHelpers.getMatchesForDay.
 */

import type { BashoState, MatchSchedule } from "../types/basho";

/**
 * Build a Map<day, MatchSchedule[]> from a basho's matches array.
 * All matches are included (both played and unplayed).
 * Callers can further filter within the returned array if needed.
 */
export function buildBashoMatchIndex(basho: BashoState): Map<number, MatchSchedule[]> {
  const index = new Map<number, MatchSchedule[]>();
  for (const match of basho.matches ?? []) {
    const dayMatches = index.get(match.day);
    if (dayMatches) {
      dayMatches.push(match);
    } else {
      index.set(match.day, [match]);
    }
  }
  return index;
}
