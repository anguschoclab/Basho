/**
 * scheduleHelpers.ts
 *
 * Helper functions for schedule generation.
 */

import type { Division } from "@/engine/types/banzuke";
import type { Rikishi } from "@/engine/types/rikishi";
import type { WorldState } from "@/engine/types/world";
import { getActiveRikishi } from "@/engine/core/selectors";
import { stableSort } from "@/engine/utils/sort";
import { DIVISION_QUOTA, JONIDAN_MAX } from "@/constants/engine/banzuke";

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
 * Sourced from the real banzuke quotas (42/28/120/160); the unfixed tiers
 * use their documented bounds — jonidan's 250 cap, jonokuchi's 40-man floor.
 */
export function getDivisionExpectedSize(division: Division): number {
  const sizes: Record<Division, number> = {
    makuuchi: DIVISION_QUOTA.makuuchi,
    juryo: DIVISION_QUOTA.juryo,
    makushita: DIVISION_QUOTA.makushita,
    sandanme: DIVISION_QUOTA.sandanme,
    jonidan: JONIDAN_MAX,
    jonokuchi: 40,
  };
  return sizes[division];
}

/**
 * Active division roster.
 *
 * Injured-but-entered rikishi ARE schedulable (W A) — the withdraw/compete
 * call belongs to the morning-of-day evaluation and the bout-level
 * fusensho gate, not to scheduling. Only explicit kyujo removes a rikishi
 * from the card.
 */
export function activeDivisionRoster(world: WorldState, division: Division): Rikishi[] {
  const pool: Rikishi[] = [];
  for (const r of getActiveRikishi(world)) {
    if (
      r.division === division &&
      !r.isKyujo &&
      !r.isMaezumo &&
      !r.isEphemeralMaezumo &&
      !r.isBanzukeGai
    ) {
      pool.push(r);
    }
  }
  return stableSort(pool, (r) => r.id);
}

/**
 * Determines if a given division requires bout scheduling for a specific basho day.
 *
 * Contract:
 * - Days are strictly 1-indexed. Valid range is [1, 15].
 * - Upper divisions (Makuuchi, Juryo) fight every day.
 * - Lower divisions (Makushita and below) fight 7 bouts per basho, strictly on odd days (1, 3, 5, 7, 9, 11, 13).
 * - Pure function. Deterministic and side-effect free.
 *
 * @param division - The division to check scheduling for.
 * @param day - The 1-indexed basho day. Returns false if day > 15.
 * @returns boolean - True if the division should have matches on this day.
 */
export function needsScheduleForDay(division: Division, day: number): boolean {
  if (day < 1) return false;
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
