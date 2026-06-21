/**
 * RecruitmentController — closed-loop replacement-rate controller.
 *
 * Computes the weekly global replacement gap from the active population vs the
 * equilibrium target captured at world generation (`world._populationTarget`).
 * The gap is then allocated across NPC stables by `allocateVacancies`.
 *
 * Read-only consumption of `_populationTarget`: this module never writes it.
 * The lifecycle plan may own `_populationTarget`; this controller self-stabilizes
 * around whatever attrition rate exists.
 */

import type { WorldState } from "../../types/world";

/**
 * Returns the number of replacements needed this tick to hold the active
 * population at its equilibrium target. Clamped at 0 so the controller never
 * drives growth above target. Returns 0 when the target is unset.
 */
export function computeReplacementGap(world: WorldState): number {
  const target = world._populationTarget;
  if (target == null) return 0;
  return Math.max(0, target - world.activeRikishiIds.size);
}
