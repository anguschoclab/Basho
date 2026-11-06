/**
 * facilities.ts
 * =============
 * Facility upgrade / degradation system.
 *
 * Each heya has three facility axes (0-100):
 *   - training: affects stat gain rates
 *   - recovery: affects injury heal speed & fatigue
 *   - nutrition: affects weight management & stamina
 *
 * Mechanics:
 *   - Monthly decay: facilities degrade if not maintained
 *   - Investment: spend funds to upgrade a facility axis
 *   - Maintenance: spend funds to prevent decay
 *   - NPC AI auto-invests based on oyakata personality + funds
 *   - FacilitiesBand is recalculated after every change
 */

import type { WorldState } from "@/engine/types/world";
import type { Heya } from "@/engine/types/heya";
import type { Id } from "@/engine/types/common";
import type { FacilitiesBand } from "@/engine/types/narrative";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import type { StateImpact } from "@/engine/core/StateImpact";
import { getHeya } from "@/engine/core/queries";
import {
  FACILITY_UPGRADE_BASE_COST,
  MAINTENANCE_COST_PER_POINT,
  MAX_FACILITY_LEVEL,
  FACILITY_UPGRADE_COST_MULTIPLIERS,
} from "@/constants/engine/facilities";

// === CONSTANTS (imported from constants/engine/facilities.ts) ===

/** Cost per point to upgrade a facility (scales with current level) */
function upgradeCost(currentLevel: number): number {
  const base = FACILITY_UPGRADE_BASE_COST;
  if (currentLevel < FACILITY_UPGRADE_COST_MULTIPLIERS.LEVEL_40) return base;
  if (currentLevel < FACILITY_UPGRADE_COST_MULTIPLIERS.LEVEL_60)
    return base * FACILITY_UPGRADE_COST_MULTIPLIERS.MULTIPLIER_40;
  if (currentLevel < FACILITY_UPGRADE_COST_MULTIPLIERS.LEVEL_80)
    return base * FACILITY_UPGRADE_COST_MULTIPLIERS.MULTIPLIER_60;
  return base * FACILITY_UPGRADE_COST_MULTIPLIERS.MULTIPLIER_80;
}

/** Monthly maintenance cost to prevent decay (per facility axis) */
function maintenanceCost(level: number): number {
  return Math.round(level * MAINTENANCE_COST_PER_POINT);
}

const MAX_FACILITY = MAX_FACILITY_LEVEL;

// === FACILITY BAND CALCULATION ===

/**
 * Compute facilities band.
 *  * @param heya - The Heya.
 *  * @returns The result.
 */
export function computeFacilitiesBand(heya: Heya): FacilitiesBand {
  const avg = (heya.facilities.training + heya.facilities.recovery + heya.facilities.nutrition) / 3;
  if (avg >= 85) return "world_class";
  if (avg >= 65) return "excellent";
  if (avg >= 45) return "adequate";
  if (avg >= 25) return "basic";
  return "minimal";
}

/**
 * Update facilities band.
 *  * @param heya - The Heya.
 */
export function updateFacilitiesBand(heya: Heya): void {
  heya.facilitiesBand = computeFacilitiesBand(heya);
}

// === PLAYER ACTIONS ===

/** Type representing facility axis. */
export type FacilityAxis = "training" | "recovery" | "nutrition";

/** Defines the structure for upgrade result. */
export interface UpgradeResult {
  success: boolean;
  axis: FacilityAxis;
  oldLevel: number;
  newLevel: number;
  cost: number;
  reason?: string;
}

/**
 * Player invests funds to upgrade a facility axis by `points` (default 5).
 * Returns StateImpact describing facility upgrade instead of mutating directly.
 */
export function investInFacility(
  world: WorldState,
  heyaId: Id,
  axis: FacilityAxis,
  points: number = 5
): StateImpact {
  const builder = createImpactBuilder("investInFacility");
  const heya = getHeya(world, heyaId);
  if (!heya) return builder.build();

  const oldLevel = heya.facilities[axis];
  const effectivePoints = Math.min(points, MAX_FACILITY - oldLevel);
  if (effectivePoints <= 0) {
    return builder.build();
  }

  // Calculate total cost for all points
  let totalCost = 0;
  for (let i = 0; i < effectivePoints; i++) {
    totalCost += upgradeCost(oldLevel + i);
  }

  if (heya.funds < totalCost) {
    return builder.build();
  }

  // Apply
  const newLevel = Math.min(MAX_FACILITY, oldLevel + effectivePoints);
  const newFacilities = { ...heya.facilities, [axis]: newLevel };
  const newFunds = heya.funds - totalCost;
  const newFacilitiesBand = computeFacilitiesBand({ ...heya, facilities: newFacilities });

  builder.updateHeya(heyaId, {
    funds: newFunds,
    facilities: newFacilities,
    facilitiesBand: newFacilitiesBand,
  });

  builder.logEvent(
    "FACILITY_UPGRADED",
    "facility",
    {
      axis,
      oldLevel,
      newLevel,
      cost: totalCost,
      band: newFacilitiesBand,
    },
    { heyaId }
  );

  return builder.build();
}

// === MONTHLY TICK: DECAY + NPC INVESTMENT ===
// The canonical monthly path lives in tick/phases/phase05_monthly_boundary.ts
// (processFacilitiesMaintenance + processNpcAutoInvestment).

// === QUERY HELPERS (for UI) ===

/**
 * Calculates the total monetary cost to upgrade the given facility axis.
 * The cost scales non-linearly as the facility level increases.
 *
 * @param heya - The target heya containing the current facility levels.
 * @param axis - Which facility axis to estimate the upgrade for.
 * @param points - The number of points to upgrade (capped dynamically by MAX_FACILITY).
 * @returns The total accumulated cost for the requested points.
 */
export function getUpgradeCostEstimate(heya: Heya, axis: FacilityAxis, points: number = 5): number {
  const current = heya.facilities[axis];
  let total = 0;
  const effective = Math.min(points, MAX_FACILITY - current);
  for (let i = 0; i < effective; i++) total += upgradeCost(current + i);
  return total;
}

/**
 * Calculates the total monthly maintenance cost across all three facility axes
 * required to prevent facility degradation.
 *
 * @param heya - The target heya containing the current facility levels.
 * @returns The total sum of maintenance costs for training, recovery, and nutrition.
 */
export function getMonthlyMaintenanceCost(heya: Heya): number {
  return (
    maintenanceCost(heya.facilities.training) +
    maintenanceCost(heya.facilities.recovery) +
    maintenanceCost(heya.facilities.nutrition)
  );
}
