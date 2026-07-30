/**
 * Recruitment Cohort Tracking System (B10)
 *
 * Tracks rikishi who entered the professional ranks in the same basho as a
 * "cohort." Enables narrative references to shared origins and career arc
 * comparisons (e.g., "the last of the 2025-hatsu cohort").
 */

import type { Rikishi } from "../../types/rikishi";

/** Sekitori divisions (juryo and above) */
const SEKITORI_DIVISIONS = new Set<string>([
  "juryo",
  "makuuchi",
]);

export interface CohortSummary {
  cohortId: string;
  totalMembers: number;
  activeMembers: number;
  retiredMembers: number;
  sekitoriCount: number;
  totalYusho: number;
  divisions: Record<string, number>;
}

/**
 * Assign a recruitment cohort ID to a rikishi.
 * Does not override an existing cohort assignment.
 */
export function assignRecruitmentCohort(
  rikishi: Rikishi,
  cohortId: string
): Rikishi {
  if (rikishi.recruitmentCohortId) return rikishi;
  return { ...rikishi, recruitmentCohortId: cohortId };
}

/**
 * Get all rikishi belonging to a specific cohort.
 */
export function getCohortMembers(
  allRikishi: Rikishi[],
  cohortId: string
): Rikishi[] {
  return allRikishi.filter((r) => r.recruitmentCohortId === cohortId);
}

/**
 * Get a summary of a cohort's current status.
 */
export function getCohortSummary(
  allRikishi: Rikishi[],
  cohortId: string
): CohortSummary | undefined {
  const members = getCohortMembers(allRikishi, cohortId);
  if (members.length === 0) return undefined;

  let activeMembers = 0;
  let retiredMembers = 0;
  let sekitoriCount = 0;
  let totalYusho = 0;
  const divisions: Record<string, number> = {};

  for (const r of members) {
    if (r.isRetired) {
      retiredMembers++;
    } else {
      activeMembers++;
      const div = r.division ?? "unknown";
      divisions[div] = (divisions[div] ?? 0) + 1;
    }
    // Count sekitori regardless of retirement status
    const div = r.division ?? "unknown";
    if (SEKITORI_DIVISIONS.has(div)) {
      sekitoriCount++;
    }
    totalYusho += r.careerRecord?.yusho ?? 0;
  }

  return {
    cohortId,
    totalMembers: members.length,
    activeMembers,
    retiredMembers,
    sekitoriCount,
    totalYusho,
    divisions,
  };
}
