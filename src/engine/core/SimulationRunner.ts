/**
 * SimulationRunner.ts — Orchestrates the simulation phases (Daily, Weekly, Post-Basho).
 * Delegates to specific systems for business logic.
 */

import { WorldState } from "../types/world";
import { SIMULATION_CONFIG } from "./SimulationConfig";
import * as MediaService from "../systems/media/MediaService";
import { resolveImpacts } from "./ImpactResolver";
import type { StateImpact } from "./StateImpact";

// Institutional System Imports
import { runPrestigeDecay } from "../prestige/prestigeSystem";
import {
  runGovernanceReview,
  runAIMetaDrift,
  runRetirements,
} from "../governance/governanceReview";
import { onBashoEnded } from "../records";
import * as talentpool from "../systems/generation/TalentPoolService";
import { processSponsorChurn } from "../systems/economics/SponsorshipService";
import { checkNaturalizations } from "../naturalization";
import { runArchivalPruning } from "../archival";
import { runCareerJournalUpdates, runRecruitmentWindow } from "../lifecycle/RegistryService";
import { runHistoryUpdates } from "../history";
import { runElections } from "../governance/GovernanceService";

/**
 * Authoritative post-basho pipeline.
 * Collects StateImpact from migrated functions and resolves them atomically.
 * Functions not yet migrated still mutate directly (will be migrated later).
 */
export function runPostBashoResolution(world: WorldState): void {
  const impacts: StateImpact[] = [];

  // Collect impacts from migrated functions
  const prestigeImpact = runPrestigeDecay(world);
  impacts.push(prestigeImpact);

  const governanceImpact = runGovernanceReview(world);
  impacts.push(governanceImpact);

  const aiMetaImpact = runAIMetaDrift(world);
  impacts.push(aiMetaImpact);

  const retirementImpact = runRetirements(world);
  impacts.push(retirementImpact);

  const sponsorImpact = processSponsorChurn(world);
  impacts.push(sponsorImpact);

  const careerJournalImpact = runCareerJournalUpdates(world);
  impacts.push(careerJournalImpact);

  const historyImpact = runHistoryUpdates(world);
  impacts.push(historyImpact);

  const electionImpact = runElections(world);
  impacts.push(electionImpact);

  // Collect impacts from newly migrated functions
  const naturalizationImpact = checkNaturalizations(world);
  impacts.push(naturalizationImpact);

  const mediaBoundaryImpact = MediaService.processWeeklyMediaBoundary(world);
  impacts.push(mediaBoundaryImpact);

  const recordsImpact = onBashoEnded(world);
  impacts.push(recordsImpact);

  // Only prune at year-end (November Basho)
  if (world.calendar.month === 11) {
    const archivalImpact = runArchivalPruning(world);
    impacts.push(archivalImpact);
  }

  // Resolve all collected impacts atomically
  const resolvedWorld = resolveImpacts(world, impacts);
  
  // Apply resolved changes to the shared world reference
  Object.assign(world, resolvedWorld);

  // Extract vacancies from retirement impact metadata for talent pool
  const vacancies = (retirementImpact.metadata as any)?.vacanciesByHeyaId || {};

  // Run recruitment window (now returns StateImpact, but we need to handle its direct mutation)
  const recruitmentImpact = runRecruitmentWindow(world, vacancies);
  const recruitmentResolved = resolveImpacts(world, [recruitmentImpact]);
  Object.assign(world, recruitmentResolved);
}
