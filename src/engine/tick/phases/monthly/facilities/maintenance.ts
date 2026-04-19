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

export function processFacilitiesMaintenance(
  _world: WorldState,
  heya: Heya,
  heyaUpdates: HeyaUpdates,
  builder: ImpactBuilder
): number {
  const maintenance =
    (heya.facilities.training + heya.facilities.recovery + heya.facilities.nutrition) * 3000;
  const currentFunds = heyaUpdates.funds ?? heya.funds ?? 0;
  if (currentFunds >= maintenance) {
    heyaUpdates.funds = currentFunds - maintenance;
  } else {
    heyaUpdates.facilities = {
      training: Math.max(5, heya.facilities.training - 2),
      recovery: Math.max(5, heya.facilities.recovery - 2),
      nutrition: Math.max(5, heya.facilities.nutrition - 2),
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
