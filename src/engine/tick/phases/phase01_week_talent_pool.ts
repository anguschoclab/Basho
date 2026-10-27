/**
 * phase01_week_talent_pool.ts
 * ===========================
 * Pipeline Phase: Weekly Talent Pool Tick.
 *
 * Responsibilities:
 * 1. Reveal hidden candidates (passive discovery).
 * 2. Age out stale candidates.
 * 3. Resolve suitor deadlines.
 *
 * Must run BEFORE phase01_week_recruitment so recruitment sees visible candidates.
 */

import type { WorldState } from "@/engine/types/world";
import type { StateImpact } from "@/engine/core/StateImpact";
import * as talentpool from "@/engine/systems/generation/TalentPoolService";

export function phase01_week_talent_pool(world: WorldState): StateImpact {
  return talentpool.tickWeekTalentPool(world);
}
