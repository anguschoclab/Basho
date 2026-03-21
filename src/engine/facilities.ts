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

import type { WorldState } from "./types/world";
import type { Heya } from "./types/heya";
import type { Id } from "./types/common";
import type { FacilitiesBand } from "./types/narrative";
import type { OyakataTraits } from "./types/oyakata";
import { logEngineEvent } from "./events";
import { stableSort } from "./utils/sort";

// === CONSTANTS ===

/** Cost per point to upgrade a facility (scales with current level) */
function upgradeCost(currentLevel: number): number {
  // Base 200k per point, scaling quadratically past 60
  const base = 200_000;
  if (currentLevel < 40) return base;
  if (currentLevel < 60) return base * 1.5;
  if (currentLevel < 80) return base * 2.5;
  return base * 4; // 80+ is very expensive
}

/** Monthly maintenance cost to prevent decay (per facility axis) */
function maintenanceCost(level: number): number {
  return Math.round(level * 3_000); // 3k per point per month
}

/** Monthly decay if maintenance is NOT paid */
const DECAY_RATE = 2; // points per month without maintenance

/** Maximum facility level */
const MAX_FACILITY = 100;
const MIN_FACILITY = 5;

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
 */
export function investInFacility(
  world: WorldState,
  heyaId: Id,
  axis: FacilityAxis,
  points: number = 5
): UpgradeResult {
  const heya = world.heyas.get(heyaId);
  if (!heya) return { success: false, axis, oldLevel: 0, newLevel: 0, cost: 0, reason: "Heya not found" };

  const oldLevel = heya.facilities[axis];
  const effectivePoints = Math.min(points, MAX_FACILITY - oldLevel);
  if (effectivePoints <= 0) {
    return { success: false, axis, oldLevel, newLevel: oldLevel, cost: 0, reason: "Already at maximum" };
  }

  // Calculate total cost for all points
  let totalCost = 0;
  for (let i = 0; i < effectivePoints; i++) {
    totalCost += upgradeCost(oldLevel + i);
  }

  if (heya.funds < totalCost) {
    return { success: false, axis, oldLevel, newLevel: oldLevel, cost: totalCost, reason: "Insufficient funds" };
  }

  // Apply
  heya.funds -= totalCost;
  heya.facilities[axis] = Math.min(MAX_FACILITY, oldLevel + effectivePoints);
  const newLevel = heya.facilities[axis];
  updateFacilitiesBand(heya);

  logEngineEvent(world, {
    type: "FACILITY_UPGRADED",
    category: "facility",
    importance: effectivePoints >= 10 ? "major" : "notable",
    scope: "heya",
    heyaId,
    title: `${heya.name} upgraded ${axis} facilities`,
    summary: `${heya.name} invested ¥${totalCost.toLocaleString()} to improve ${axis} facilities from ${oldLevel} to ${newLevel}.`,
    data: { axis, oldLevel, newLevel, cost: totalCost, band: heya.facilitiesBand }
  });

  return { success: true, axis, oldLevel, newLevel, cost: totalCost };
}

// === MONTHLY TICK: DECAY + NPC INVESTMENT ===

/**
 * Called at monthly boundary. For each heya:
 *  1. Apply maintenance cost or decay
 *  2. NPC stables auto-invest if they can afford it
 */
export function tickMonthly(world: WorldState): void {
  for (const heya of stableSort(Array.from(world.heyas.values()), x => (x as any).id || String(x))) {
    applyMonthlyDecayOrMaintenance(world, heya);

    // NPC auto-investment (skip player heya)
    if (heya.id !== world.playerHeyaId) {
      npcFacilityInvestment(world, heya);
    }
  }
}

/**
 * Apply monthly decay or maintenance.
 *  * @param world - The World.
 *  * @param heya - The Heya.
 */
function applyMonthlyDecayOrMaintenance(world: WorldState, heya: Heya): void {
  const axes: FacilityAxis[] = ["training", "recovery", "nutrition"];
  const totalMaintenance = maintenanceCost(heya.facilities.training) + maintenanceCost(heya.facilities.recovery) + maintenanceCost(heya.facilities.nutrition);

  if (heya.funds >= totalMaintenance) {
    // Pay maintenance — no decay
    heya.funds -= totalMaintenance;
  } else {
    // Can't afford maintenance — facilities decay
    let decayed = false;
    for (const axis of axes) {
      const old = heya.facilities[axis];
      heya.facilities[axis] = Math.max(MIN_FACILITY, old - DECAY_RATE);
      if (heya.facilities[axis] < old) decayed = true;
    }

    if (decayed) {
      const oldBand = heya.facilitiesBand;
      updateFacilitiesBand(heya);

      if (heya.facilitiesBand !== oldBand) {
        logEngineEvent(world, {
          type: "FACILITY_DEGRADED",
          category: "facility",
          importance: "notable",
          scope: "heya",
          heyaId: heya.id,
          title: `${heya.name} facilities deteriorating`,
          summary: `${heya.name} couldn't afford maintenance. Facilities degraded from "${oldBand}" to "${heya.facilitiesBand}".`,
          data: {
            oldBand,
            newBand: heya.facilitiesBand,
            training: heya.facilities.training,
            recovery: heya.facilities.recovery,
            nutrition: heya.facilities.nutrition
          }
        });
      }
    }
  }
}

/**
 * NPC oyakata invest in facilities based on personality + funds.
 * - High-ambition oyakata prioritize training
 * - High-compassion oyakata prioritize recovery
 * - Traditionalists spread evenly
 */
function npcFacilityInvestment(world: WorldState, heya: Heya): void {
  const oyakata = world.oyakata.get(heya.oyakataId);
  if (!oyakata) return;

  // Only invest if funds are healthy (> 6 months runway)
  const avgFacility = (heya.facilities.training + heya.facilities.recovery + heya.facilities.nutrition) / 3;
  const monthlyBurn = heya.rikishiIds.length * 150_000 + avgFacility * 9_000;
  const runwayMonths = monthlyBurn > 0 ? heya.funds / monthlyBurn : 0;

  if (runwayMonths < 6) return; // Too tight to invest

  // Determine priority axis
  const traits = oyakata.traits;
  let priorityAxis: FacilityAxis = "training";
  let minLevel = heya.facilities.training;

  // Compassionate oyakata prioritize recovery
  if (traits.compassion > 70 && heya.facilities.recovery < heya.facilities.training) {
    priorityAxis = "recovery";
    minLevel = heya.facilities.recovery;
  }
  // Ambitious oyakata want training
  else if (traits.ambition > 70) {
    priorityAxis = "training";
    minLevel = heya.facilities.training;
  }
  // Otherwise upgrade the weakest
  else {
    const axes: FacilityAxis[] = ["training", "recovery", "nutrition"];
    for (const a of axes) {
      if (heya.facilities[a] < minLevel) {
        minLevel = heya.facilities[a];
        priorityAxis = a;
      }
    }
  }

  // Invest 3-5 points if affordable and below 80
  if (minLevel >= 80) return;

  const points = minLevel < 40 ? 5 : 3;
  let cost = 0;
  for (let i = 0; i < points; i++) cost += upgradeCost(minLevel + i);

  if (heya.funds >= cost * 2) { // Only if they can afford double (conservative)
    heya.funds -= cost;
    heya.facilities[priorityAxis] = Math.min(MAX_FACILITY, heya.facilities[priorityAxis] + points);
    updateFacilitiesBand(heya);
  }
}

// === QUERY HELPERS (for UI) ===

/**
 * Get upgrade cost estimate.
 *  * @param heya - The Heya.
 *  * @param axis - The Axis.
 *  * @param points - The Points.
 *  * @returns The result.
 */
export function getUpgradeCostEstimate(heya: Heya, axis: FacilityAxis, points: number = 5): number {
  const current = heya.facilities[axis];
  let total = 0;
  const effective = Math.min(points, MAX_FACILITY - current);
  for (let i = 0; i < effective; i++) total += upgradeCost(current + i);
  return total;
}

/**
 * Get monthly maintenance cost.
 *  * @param heya - The Heya.
 *  * @returns The result.
 */
export function getMonthlyMaintenanceCost(heya: Heya): number {
  return maintenanceCost(heya.facilities.training)
    + maintenanceCost(heya.facilities.recovery)
    + maintenanceCost(heya.facilities.nutrition);
}
