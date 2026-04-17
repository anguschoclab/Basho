/**
 * scheduleHelpers.ts
 *
 * Helper functions for schedule generation.
 */

import type { Division } from "./types/banzuke";
import type { Rikishi } from "./types/rikishi";
import type { WorldState } from "./types/world";
import { getActiveRikishi } from "./selectors";
import { stableSort } from "./utils/sort";
import type { MatchPairing } from "./matchmaking/index";

/** Default bout days per division (sekitori = 15, lower = 7) */
export const DEFAULT_DIVISION_DAYS: Record<Division, number> = {
  makuuchi: 15,
  juryo: 15,
  makushita: 7,
  sandanme: 7,
  jonidan: 7,
  jonokuchi: 7,
};

/**
 * Get the expected roster size for a division.
 * Based on real-life sumo division sizes.
 */
export function getDivisionExpectedSize(division: Division): number {
  const sizes: Record<Division, number> = {
    makuuchi: 42,
    juryo: 28,
    makushita: 120,
    sandanme: 200,
    jonidan: 200,
    jonokuchi: 200,
  };
  return sizes[division];
}

/**
 * Get the division below the given division in the hierarchy.
 * Returns null for the bottom division (jonokuchi).
 */
export function getDivisionBelow(division: Division): Division | null {
  const hierarchy: Division[] = [
    "makuuchi",
    "juryo",
    "makushita",
    "sandanme",
    "jonidan",
    "jonokuchi",
  ];
  const index = hierarchy.indexOf(division);
  if (index === -1 || index === hierarchy.length - 1) {
    return null;
  }
  return hierarchy[index + 1];
}

/**
 * Active division roster.
 */
export function activeDivisionRoster(world: WorldState, division: Division): Rikishi[] {
  const pool: Rikishi[] = [];
  for (const r of getActiveRikishi(world)) {
    if (r.division === division && !r.injured) {
      pool.push(r);
    }
  }
  return stableSort(pool, (r) => r.id);
}

/**
 * Greedy selection of non-overlapping pairs.
 * Candidates should be pre-sorted by score (descending).
 */
export function greedySelectPairs(
  candidates: MatchPairing[],
  maxPairs: number,
  used = new Set<string>()
): MatchPairing[] {
  const selected: MatchPairing[] = [];

  for (const c of candidates) {
    if (selected.length >= maxPairs) break;
    if (used.has(c.eastId) || used.has(c.westId)) continue;

    selected.push(c);
    used.add(c.eastId);
    used.add(c.westId);
  }

  return selected;
}

/**
 * Check if a specific day needs scheduling for a division.
 */
export function needsScheduleForDay(division: Division, day: number): boolean {
  if (day > 15) return false;

  const divDays = DEFAULT_DIVISION_DAYS[division];
  // Lower divisions fight on odd days only, up to day 13 (7 bouts: 1, 3, 5, 7, 9, 11, 13)
  if (divDays === 7) {
    if (day % 2 === 0) return false;
    if (day > 13) return false;
  }

  return true;
}

/**
 * Get total expected bouts for a division in a basho.
 */
export function getTotalBashodays(division: Division): number {
  return DEFAULT_DIVISION_DAYS[division];
}
