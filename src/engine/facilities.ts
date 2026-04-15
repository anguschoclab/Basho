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
import { createImpactBuilder } from "./core/ImpactBuilder";
import type { StateImpact } from "./core/StateImpact";
import { calculateHeyaWeeklyFinances } from "./systems/economy/FinanceCalculator";

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
 * Returns StateImpact describing facility upgrade instead of mutating directly.
 */
export function investInFacility(
  world: WorldState,
  heyaId: Id,
  axis: FacilityAxis,
  points: number = 5
): StateImpact {
  const builder = createImpactBuilder("investInFacility");
  const heya = world.heyas.get(heyaId);
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

/**
 * Called at monthly boundary. For each heya:
 *  1. Apply maintenance cost or decay
 *  2. NPC stables auto-invest if they can afford it
 * Returns StateImpact describing monthly facility updates instead of mutating directly.
 */
export function tickMonthlyFacilities(world: WorldState): StateImpact {
  const builder = createImpactBuilder("tickMonthlyFacilities");

  for (const heya of world.heyas.values()) {
    const decayImpact = applyMonthlyDecayOrMaintenance(world, heya);
    if (decayImpact.entities?.heyaUpdates) {
      for (const [id, update] of decayImpact.entities.heyaUpdates) {
        builder.updateHeya(id, update);
      }
    }
    if (decayImpact.events) {
      decayImpact.events.forEach((event) => {
        builder.logEvent(event.type, event.category, event.data, { heyaId: heya.id });
      });
    }

    // NPC auto-investment (skip player heya)
    if (heya.id !== world.playerHeyaId) {
      const npcImpact = npcFacilityInvestment(world, heya);
      if (npcImpact.entities?.heyaUpdates) {
        for (const [id, update] of npcImpact.entities.heyaUpdates) {
          builder.updateHeya(id, update);
        }
      }
    }
  }

  return builder.build();
}

/**
 * Apply monthly decay or maintenance.
 * Returns StateImpact describing decay/maintenance instead of mutating directly.
 */
function applyMonthlyDecayOrMaintenance(_world: WorldState, heya: Heya): StateImpact {
  const builder = createImpactBuilder("applyMonthlyDecayOrMaintenance");
  const axes: FacilityAxis[] = ["training", "recovery", "nutrition"];
  const totalMaintenance = axes.reduce((sum, a) => sum + maintenanceCost(heya.facilities[a]), 0);

  if (heya.funds >= totalMaintenance) {
    // Pay maintenance — no decay
    builder.updateHeya(heya.id, { funds: heya.funds - totalMaintenance });
  } else {
    // Can't afford maintenance — facilities decay
    const newFacilities = { ...heya.facilities };
    let decayed = false;
    for (const axis of axes) {
      const old = heya.facilities[axis];
      newFacilities[axis] = Math.max(MIN_FACILITY, old - DECAY_RATE);
      if (newFacilities[axis] < old) decayed = true;
    }

    if (decayed) {
      const oldBand = heya.facilitiesBand;
      const newFacilitiesBand = computeFacilitiesBand({ ...heya, facilities: newFacilities });

      if (newFacilitiesBand !== oldBand) {
        builder.logEvent(
          "FACILITY_DEGRADED",
          "facility",
          {
            oldBand,
            newBand: newFacilitiesBand,
            training: newFacilities.training,
            recovery: newFacilities.recovery,
            nutrition: newFacilities.nutrition,
          },
          { heyaId: heya.id }
        );
      }
    }

    builder.updateHeya(heya.id, {
      facilities: newFacilities,
      facilitiesBand: computeFacilitiesBand({ ...heya, facilities: newFacilities }),
    });
  }

  return builder.build();
}

/**
 * NPC oyakata invest in facilities based on personality + funds.
 * - High-ambition oyakata prioritize training
 * - High-compassion oyakata prioritize recovery
 * - Traditionalists spread evenly
 * Returns StateImpact describing NPC investment instead of mutating directly.
 */
function npcFacilityInvestment(world: WorldState, heya: Heya): StateImpact {
  const builder = createImpactBuilder("npcFacilityInvestment");
  const oyakata = heya.oyakataId ? world.oyakata.get(heya.oyakataId) : undefined;
  if (!oyakata) return builder.build();

  // Only invest if funds are healthy (> 6 months runway)
  // Use actual calculated expenses instead of hardcoded estimate to avoid inflated burn
  const weeklyFinances = calculateHeyaWeeklyFinances(heya, world);
  const monthlyBurn = Math.max(1, weeklyFinances.expenses * 4); // Convert weekly to monthly

  const runwayMonths = monthlyBurn > 0 ? heya.funds / monthlyBurn : 0;

  if (runwayMonths < 6) return builder.build(); // Too tight to invest

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
  if (minLevel >= 80) return builder.build();

  const points = minLevel < 40 ? 5 : 3;
  let cost = 0;
  for (let i = 0; i < points; i++) cost += upgradeCost(minLevel + i);

  if (heya.funds >= cost * 2) {
    // Only if they can afford double (conservative)
    const newFunds = heya.funds - cost;
    const newFacilities = {
      ...heya.facilities,
      [priorityAxis]: Math.min(MAX_FACILITY, heya.facilities[priorityAxis] + points),
    };
    const newFacilitiesBand = computeFacilitiesBand({ ...heya, facilities: newFacilities });

    builder.updateHeya(heya.id, {
      funds: newFunds,
      facilities: newFacilities,
      facilitiesBand: newFacilitiesBand,
    });
  }

  return builder.build();
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
  return (
    maintenanceCost(heya.facilities.training) +
    maintenanceCost(heya.facilities.recovery) +
    maintenanceCost(heya.facilities.nutrition)
  );
}
