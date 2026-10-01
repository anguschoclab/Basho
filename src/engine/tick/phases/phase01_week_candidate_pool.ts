/**
 * phase01_week_candidate_pool.ts
 * ==============================
 * Pipeline Phase: Weekly Candidate Pool (NPC Watchlist) Tick.
 *
 * Responsibilities:
 * 1. Run NPC interest simulation to populate the candidate pool
 * 2. Resolve expired suitor deadlines
 * 3. Remove candidates no longer available in the main talent pool
 * 4. Shift NPC interest levels
 *
 * Must run AFTER phase01_week_talent_pool so the main talent pool
 * has visible candidates for NPC interest simulation.
 */

import type { WorldState } from "../../types/world";
import type { StateImpact } from "../../core/StateImpact";
import { createImpactBuilder } from "../../core/ImpactBuilder";
import {
  simulateNPCInterest,
  tickWeekCandidatePool,
  ensureCandidatePoolState,
} from "../../systems/generation/CandidatePoolService";

export function phase01_week_candidate_pool(world: WorldState): StateImpact {
  const builder = createImpactBuilder("phase01_week_candidate_pool");
  // Ensure the pool exists, then simulate NPC interest + run weekly maintenance.
  // Both return StateImpacts — merge them or the NPC-interest writes evaporate.
  ensureCandidatePoolState(world);
  builder.merge(simulateNPCInterest(world));
  builder.merge(tickWeekCandidatePool(world));
  return builder.build();
}
