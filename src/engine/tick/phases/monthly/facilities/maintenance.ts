/**
 * maintenance.ts
 * ==============
 * Monthly facility maintenance and decay processing.
 * Extracted from phase05_monthly_boundary.ts for modularity.
 */

import type { WorldState } from "../../../../types/world";
import type { Heya } from "../../../../types/heya";
import type { HeyaUpdates } from "../types";
import type { ImpactBuilder } from "../../../../core/ImpactBuilder";
import { computeFacilitiesBand } from "../../../../facilities";
import {
  MAINTENANCE_COST_PER_POINT,
  MIN_FACILITY_LEVEL,
  FACILITY_DECAY_AMOUNT,
} from "../../../../../constants/engine/facilities";

export function processFacilitiesMaintenance(
  _world: WorldState,
  heya: Heya,
  heyaUpdates: HeyaUpdates,
  builder: ImpactBuilder
): number {
  const maintenance =
    (heya.facilities.training + heya.facilities.recovery + heya.facilities.nutrition) *
    MAINTENANCE_COST_PER_POINT;
  const currentFunds = heyaUpdates.funds ?? heya.funds ?? 0;
  if (currentFunds >= maintenance) {
    heyaUpdates.funds = currentFunds - maintenance;
  } else {
    heyaUpdates.facilities = {
      training: Math.max(MIN_FACILITY_LEVEL, heya.facilities.training - FACILITY_DECAY_AMOUNT),
      recovery: Math.max(MIN_FACILITY_LEVEL, heya.facilities.recovery - FACILITY_DECAY_AMOUNT),
      nutrition: Math.max(MIN_FACILITY_LEVEL, heya.facilities.nutrition - FACILITY_DECAY_AMOUNT),
    };
    heyaUpdates.facilitiesBand = computeFacilitiesBand(heya);
    builder.logEvent(
      "FACILITY_DEGRADED",
      "economy",
      {
        heyaname: heya.name,
        reason: "insufficient_funds_for_maintenance",
        training: heyaUpdates.facilities.training,
        recovery: heyaUpdates.facilities.recovery,
        nutrition: heyaUpdates.facilities.nutrition,
      },
      { heyaId: heya.id, importance: "notable" }
    );
  }
  return maintenance;
}
