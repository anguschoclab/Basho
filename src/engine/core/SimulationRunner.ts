/**
 * SimulationRunner.ts — Orchestrates the simulation phases (Daily, Weekly, Post-Basho).
 * Delegates to specific systems for business logic.
 */

import type { WorldState } from "../types/world";
import * as MediaService from "../systems/media/MediaService";
import { rngForWorld } from "../rng";
import { resolveImpacts } from "./ImpactResolver";
import type { StateImpact } from "./StateImpact";

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
import { runRetiredRikishiSummarization } from "../archival";
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
  const impacts: StateImpact[] = [];
  const rng = rngForWorld(world, "postBasho", "sponsorChurn");

  // Collect impacts from migrated functions
  const prestigeImpact = runPrestigeDecay(world);
  impacts.push(prestigeImpact);

  const governanceImpact = runGovernanceReview(world);
  impacts.push(governanceImpact);

  const aiMetaImpact = runAIMetaDrift(world);
  impacts.push(aiMetaImpact);

  const retirementImpact = runRetirements(world);
  impacts.push(retirementImpact);

  const sponsorImpact = processSponsorChurn(world, rng);
  impacts.push(sponsorImpact);

  const koenkaiBandImpact = adjustKoenkaiBandToPrestige(world);
  impacts.push(koenkaiBandImpact);

  const careerJournalImpact = runCareerJournalUpdates(world);
  impacts.push(careerJournalImpact);

  const historyImpact = runHistoryUpdates(world);
  impacts.push(historyImpact);

  const almanacImpact = runAlmanacNarrativeUpdate(world);
  impacts.push(almanacImpact);

  const electionImpact = runElections(world);
  impacts.push(electionImpact);

  // Collect impacts from newly migrated functions
  const naturalizationImpact = checkNaturalizations(world);
  impacts.push(naturalizationImpact);

  const mediaBoundaryImpact = MediaService.processWeeklyMediaBoundary(world);
  impacts.push(mediaBoundaryImpact);

  const recordsImpact = onBashoEnded(world);
  impacts.push(recordsImpact);

  // Only summarize at year-end (November Basho).
  // Full retired Rikishi are converted to compact RetiredRikishiSummary entries
  // in world.historicalRikishi. Full career detail is preserved in cold storage
  // (archived at retirement time via CareerService / governanceReview).
  if (world.calendar?.month === 11) {
    const summarizationImpact = runRetiredRikishiSummarization(world);
    impacts.push(summarizationImpact);
  }

  // Resolve all collected impacts atomically
  const resolvedWorld = resolveImpacts(world, impacts);

  // Extract vacancies from retirement impact metadata for talent pool
  const vacancies =
    (retirementImpact.metadata?.vacanciesByHeyaId as Record<string, number> | undefined) ?? {};

  // Run recruitment window on the resolved world, then resolve its impact
  const recruitmentImpact = openRecruitmentWindow(resolvedWorld, vacancies);
  const finalWorld = resolveImpacts(resolvedWorld, [recruitmentImpact]);

  // Return the final world so callers can use it immutably
  return finalWorld;
}
