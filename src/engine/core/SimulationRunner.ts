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

/**
 * Authoritative post-basho pipeline.
 * Collects StateImpact from migrated functions and resolves them atomically.
 * Functions not yet migrated still mutate directly (Phase 4).
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

  // Resolve all collected impacts atomically
  const resolvedWorld = resolveImpacts(world, impacts);
  
  // Apply resolved changes to the shared world reference
  Object.assign(world, resolvedWorld);

  // Extract vacancies from retirement impact metadata for talent pool
  const vacancies = (retirementImpact.metadata as any)?.vacanciesByHeyaId || {};

  // Run functions that still mutate directly (will be migrated in Phase 4)
  try {
    // Fill vacancies immediately post-basho to ensure stable rosters
    const worldAfterFill = talentpool.fillVacanciesForNPC(world, vacancies);
    // Materialize any remaining signed candidates (including player recruits)
    const finalizedWorld = talentpool.finalizeSignedCandidates(worldAfterFill);
    
    // Apply functional changes back to the shared world reference
    Object.assign(world, finalizedWorld);

    checkNaturalizations(world);
    MediaService.processWeeklyMediaBoundary(world.mediaState as any);
    onBashoEnded(world);

    // Only prune at year-end (November Basho)
    if (world.calendar.month === 11) {
      runArchivalPruning(world);
    }
  } catch (e) {
    console.error(`SimulationRunner: Error in post-basho resolution`, e);
  }
}
