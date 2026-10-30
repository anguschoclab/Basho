/**
 * maintenance.ts
 * ==============
 * Monthly facility maintenance and decay processing.
 * Extracted from phase05_monthly_boundary.ts for modularity.
 */

import type { WorldState } from "@/engine/types/world";
import type { Heya } from "@/engine/types/heya";
import type { HeyaUpdates } from "@/engine/tick/phases/monthly/types";
import type { ImpactBuilder } from "@/engine/core/ImpactBuilder";
import { computeFacilitiesBand } from "@/engine/economy/facilities";
import {
  MAINTENANCE_COST_PER_POINT,
  MIN_FACILITY_LEVEL,
  FACILITY_DECAY_AMOUNT,
} from "@/constants/engine/facilities";

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
    // Paid maintenance also repairs facility wear (optional/deferred item).
    if (heya.infrastructure) {
      const next: typeof heya.infrastructure = {};
      let changed = false;
      for (const [fid, st] of Object.entries(heya.infrastructure)) {
        const cond = st.condition ?? 100;
        if (cond < 100) {
          next[fid] = { ...st, condition: Math.min(100, cond + 5) };
          changed = true;
        } else next[fid] = st;
      }
      if (changed) heyaUpdates.infrastructure = next;
    }
  } else {
    heyaUpdates.facilities = {
      training: Math.max(MIN_FACILITY_LEVEL, heya.facilities.training - FACILITY_DECAY_AMOUNT),
      recovery: Math.max(MIN_FACILITY_LEVEL, heya.facilities.recovery - FACILITY_DECAY_AMOUNT),
      nutrition: Math.max(MIN_FACILITY_LEVEL, heya.facilities.nutrition - FACILITY_DECAY_AMOUNT),
    };
    // Band must reflect the decayed facilities, not the pre-decay entity.
    heyaUpdates.facilitiesBand = computeFacilitiesBand({
      ...heya,
      facilities: heyaUpdates.facilities,
    });
    // Unpaid maintenance — infrastructure wear decays (optional/deferred item).
    if (heya.infrastructure) {
      const next: typeof heya.infrastructure = {};
      let changed = false;
      for (const [fid, st] of Object.entries(heya.infrastructure)) {
        const cond = st.condition ?? 100;
        const decayed = Math.max(0, cond - 8);
        if (decayed !== cond) {
          next[fid] = { ...st, condition: decayed };
          changed = true;
        } else next[fid] = st;
      }
      if (changed) heyaUpdates.infrastructure = next;
    }
    builder.logEvent(
      "FACILITY_DEGRADED",
      "facility",
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
