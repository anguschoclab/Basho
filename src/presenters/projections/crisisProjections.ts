/**
 * crisisProjections.ts
 * ====================
 * Projections for Crisis System data.
 */

import type { WorldState } from "@/engine/types/world";
import type { ActiveCrisis } from "@/engine/types/crises";
import { getPlayerHeya } from "@/engine/queries";

export interface CrisisProjection {
  isActive: boolean;
  pendingCrisis: ActiveCrisis | null;
  activeCrisis: ActiveCrisis | null;
  hasUnacknowledgedCrisis: boolean;
  crisisCount: number;
}

/**
 * Project crisis data for UI consumption
 */
export function projectCrisisData(world: WorldState): CrisisProjection {
  const playerHeya = getPlayerHeya(world);
  const activeCrisis = playerHeya?.activeCrisis || null;
  const pendingCrisis = world.pendingCrisis || null;

  return {
    isActive: !!activeCrisis || !!pendingCrisis,
    pendingCrisis,
    activeCrisis,
    hasUnacknowledgedCrisis: !!pendingCrisis,
    crisisCount: activeCrisis ? 1 : 0,
  };
}

/**
 * Check if there's a pending crisis that needs attention
 */
export function hasPendingCrisis(world: WorldState): boolean {
  return !!world.pendingCrisis;
}

/**
 * Get the pending crisis details
 */
export function getPendingCrisis(world: WorldState): ActiveCrisis | null {
  return world.pendingCrisis || null;
}

/**
 * Get active crisis for player heya
 */
export function getActiveCrisis(world: WorldState): ActiveCrisis | null {
  const playerHeya = getPlayerHeya(world);
  return playerHeya?.activeCrisis || null;
}
