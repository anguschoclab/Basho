/**
 * historyCohortProjections.ts — projects cohort summaries for HistoryDashboard.
 *
 * Groups rikishi by recruitmentCohortId and returns cohort summaries
 * using CohortTracking.getCohortSummary.
 */
import type { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";
import { getAllRikishi, isRetiredRikishiSummaryEntry } from "@/presenters/worldAccess";
import { getCohortSummary, getCohortMembers } from "@/engine/generation/CohortTracking";

export interface CohortDTO {
  cohortId: string;
  totalMembers: number;
  activeMembers: number;
  retiredMembers: number;
  sekitoriCount: number;
  totalYusho: number;
  topProspects: Array<{
    rikishiId: string;
    shikona: string;
    rank: string;
    isRetired: boolean;
  }>;
}

export function selectCohortSummaries(world: WorldState): CohortDTO[] {
  // Cohort membership must survive retirement — full retiree records live in
  // world.historicalRikishi (with recruitmentCohortId intact) until year-end
  // summarization; getAllRikishi is active-only (S8-3). Summaries carry no
  // cohort id, so only the full-record form is merged.
  const allRikishi = getAllRikishi(world) as Rikishi[];
  for (const entry of world.historicalRikishi?.values() ?? []) {
    if (!isRetiredRikishiSummaryEntry(entry)) allRikishi.push(entry as Rikishi);
  }
  const cohortIds = new Set<string>();

  for (const r of allRikishi) {
    if (r.recruitmentCohortId) cohortIds.add(r.recruitmentCohortId);
  }

  const results: CohortDTO[] = [];

  for (const cohortId of cohortIds) {
    const summary = getCohortSummary(allRikishi, cohortId);
    if (!summary) continue;

    const members = getCohortMembers(allRikishi, cohortId);
    const topProspects = members
      .slice()
      .sort((a, b) => {
        const aRank = a.rankNumber ?? 99;
        const bRank = b.rankNumber ?? 99;
        return aRank - bRank;
      })
      .slice(0, 5)
      .map((r) => ({
        rikishiId: r.id,
        shikona: r.shikona,
        rank: r.rank ?? "—",
        isRetired: r.isRetired ?? false,
      }));

    results.push({
      cohortId,
      totalMembers: summary.totalMembers,
      activeMembers: summary.activeMembers,
      retiredMembers: summary.retiredMembers,
      sekitoriCount: summary.sekitoriCount,
      totalYusho: summary.totalYusho,
      topProspects,
    });
  }

  // Sort by cohort ID descending (most recent first, assuming cohort IDs contain year)
  return results.sort((a, b) => b.cohortId.localeCompare(a.cohortId));
}
