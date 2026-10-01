/**
 * SimulationRunner.ts — Orchestrates the simulation phases (Daily, Weekly, Post-Basho).
 * Delegates to specific systems for business logic.
 */

import type { WorldState } from "../types/world";
import * as MediaService from "../systems/media/MediaService";
import { rngForWorld } from "../rng";
import { resolveImpacts, sequenceImpacts } from "./ImpactResolver";

// Institutional System Imports
import { runPrestigeDecay } from "../prestige/prestigeSystem";
import {
  runGovernanceReview,
  runAIMetaDrift,
  runRetirements,
} from "../systems/governance/governanceReview";
import { onBashoEnded } from "../records";
import {
  processSponsorChurn,
  adjustKoenkaiBandToPrestige,
} from "../systems/economy/SponsorshipService";
import { checkNaturalizations } from "../naturalization";
import { runCareerJournalUpdates, openRecruitmentWindow } from "../lifecycle/RegistryService";
import { runHistoryUpdates } from "../history";
import { runElections } from "../systems/governance/ScandalService";
import { runAlmanacNarrativeUpdate } from "../almanac/narrativeEnrichment";

/**
 * Authoritative post-basho pipeline.
 * Collects StateImpact from migrated functions and resolves them atomically.
 * Functions not yet migrated still mutate directly (will be migrated later).
 */
export function runPostBashoResolution(world: WorldState): WorldState {
  const rng = rngForWorld(world, "postBasho", "sponsorChurn");

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
      const impact = runRetirements(w);
      retirementVacancies =
        (impact.metadata?.vacanciesByHeyaId as Record<string, number> | undefined) ?? {};
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
