/**
 * SimulationRunner.ts — Orchestrates the simulation phases (Daily, Weekly, Post-Basho).
 * Delegates to specific systems for business logic.
 */

import type { WorldState } from "@/engine/types/world";
import * as MediaService from "@/engine/media/MediaService";
import { rngForWorld } from "@/engine/core/rng";
import { resolveImpacts, sequenceImpacts } from "@/engine/core/ImpactResolver";

// Institutional System Imports
import { runPrestigeDecay } from "@/engine/history/prestige";
import {
  runGovernanceReview,
  runAIMetaDrift,
} from "@/engine/governance/services/governanceReview";
import { processAllRetirements } from "@/engine/lifecycle/processRetirements";
import { onBashoEnded } from "@/engine/history/records";
import {
  processSponsorChurn,
  adjustKoenkaiBandToPrestige,
} from "@/engine/economy/SponsorshipService";
import { checkNaturalizations } from "@/engine/lifecycle/naturalization";
import { runCareerJournalUpdates, openRecruitmentWindow } from "@/engine/lifecycle/RegistryService";
import { runHistoryUpdates } from "@/engine/history/history";
import { runElections } from "@/engine/governance/services/ScandalService";
import { runAlmanacNarrativeUpdate } from "@/engine/almanac/narrativeEnrichment";

/**
 * Authoritative post-basho pipeline.
 * Collects StateImpact from migrated functions and resolves them atomically.
 * Functions not yet migrated still mutate directly (will be migrated later).
 */
export function runPostBashoResolution(world: WorldState): WorldState {
  const rng = rngForWorld(
    world,
    "postBasho",
    `sponsorChurn_${world.year}_${world.currentBasho?.bashoName ?? world.week}`
  );

  // Note: retired-rikishi summarization now happens at the year boundary in
  // phase06_yearly_boundary (tick pipeline), so it fires in BOTH the player
  // flow AND AutoSim. The old November-specific call here only covered the
  // player flow, leaving AutoSim's historicalRikishi unbounded.

  // Sequence each stage against progressively-resolved state — these produce
  // absolute field snapshots (mediaState, funds, records), so batching them
  // under last-write-wins would let later stages clobber earlier deltas.
  let retirementVacancies: Record<string, number> = {};
  const { world: resolvedWorld } = sequenceImpacts(world, [
    (w) => runPrestigeDecay(w),
    (w) => runGovernanceReview(w),
    (w) => runAIMetaDrift(w),
    (w) => {
      const { impact, vacanciesByHeyaId } = processAllRetirements(w);
      retirementVacancies = vacanciesByHeyaId ?? {};
      return impact;
    },
    (w) => processSponsorChurn(w, rng),
    (w) => adjustKoenkaiBandToPrestige(w),
    (w) => runCareerJournalUpdates(w),
    (w) => runHistoryUpdates(w),
    (w) => runAlmanacNarrativeUpdate(w),
    (w) => runElections(w),
    (w) => checkNaturalizations(w),
    (w) => MediaService.processWeeklyMediaBoundary(w),
    (w) => onBashoEnded(w),
  ]);

  // Extract vacancies from retirement impact metadata for talent pool
  const vacancies = retirementVacancies;

  // Run recruitment window on the resolved world, then resolve its impact
  const recruitmentImpact = openRecruitmentWindow(resolvedWorld, vacancies);
  const finalWorld = resolveImpacts(resolvedWorld, [recruitmentImpact]);

  // Return the final world so callers can use it immutably
  return finalWorld;
}
