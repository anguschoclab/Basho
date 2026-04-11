/**
 * SimulationRunner.ts — Orchestrates the simulation phases (Daily, Weekly, Post-Basho).
 * Delegates to specific systems for business logic.
 */

import { WorldState } from "../types/world";
import { SIMULATION_CONFIG } from "./SimulationConfig";
import * as MediaService from "../systems/media/MediaService";

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
 */
export function runPostBashoResolution(world: WorldState): void {
  const steps = [
    { name: "Prestige Decay", fn: () => runPrestigeDecay(world) },
    { name: "Governance Review", fn: () => runGovernanceReview(world) },
    { name: "AI Meta Drift", fn: () => runAIMetaDrift(world) },
    {
      name: "Lifecycle (Retirements)",
      fn: () => {
        const vacancies = runRetirements(world);
        // Fill vacancies immediately post-basho to ensure stable rosters
        talentpool.fillVacanciesForNPC(world, vacancies);
        // Materialize any remaining signed candidates (including player recruits)
        talentpool.finalizeSignedCandidates(world);
      },
    },
    { name: "Sponsor Churn", fn: () => processSponsorChurn(world) },
    { name: "Naturalization", fn: () => checkNaturalizations(world) },
    {
      name: "Media Snapshot",
      fn: () =>
        MediaService.processWeeklyMediaBoundary(world.mediaState as any),
    },
    { name: "Records Update", fn: () => onBashoEnded(world) },
    {
      name: "Archival Pruning",
      fn: () => {
        // Only prune at year-end (November Basho)
        if (world.calendar.month === 11) {
          runArchivalPruning(world);
        }
      },
    },
  ];

  for (const step of steps) {
    try {
      step.fn();
    } catch (e) {
      console.error(`SimulationRunner: Error in ${step.name}`, e);
    }
  }
}
