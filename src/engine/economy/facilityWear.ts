/**
 * src/engine/economy/facilityWear.ts
 * =====================================================
 * Named-facility condition (deferred wear item): monthly decay, repair
 * cost, and the refurbish action. Effectiveness scaling lives in
 * InfrastructureService.getHeyaBonuses.
 */

import type { WorldState } from "@/engine/types/world";
import type { Id } from "@/engine/types/common";
import type { FacilityId } from "@/engine/types/infrastructure";
import { FACILITY_REGISTRY } from "@/engine/types/infrastructure";
import type { StateImpact } from "@/engine/core/StateImpact";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import {
  FACILITY_CONDITION_DECAY_PER_MONTH,
  FACILITY_REPAIR_COST_FRACTION,
} from "@/constants/engine/facilities";

/** Cost to restore a facility to full condition. */
export function repairCostFor(def: { baseCost: number }, condition: number): number {
  const missing = Math.max(0, 100 - condition);
  return Math.round(def.baseCost * FACILITY_REPAIR_COST_FRACTION * missing);
}

/**
 * Monthly wear tick — every active facility loses condition. Called from
 * phase05_monthly_boundary alongside the rest of the monthly upkeep.
 */
export function tickFacilityCondition(world: WorldState): StateImpact {
  const builder = createImpactBuilder("tickFacilityCondition");
  for (const heya of world.heyas.values()) {
    const infra = heya.infrastructure;
    if (!infra) continue;
    let dirty = false;
    const next: typeof infra = { ...infra };
    for (const [id, state] of Object.entries(infra)) {
      if (state?.status !== "active") continue;
      const condition = Math.max(
        0,
        (state.condition ?? 100) - FACILITY_CONDITION_DECAY_PER_MONTH
      );
      if (condition !== state.condition) {
        next[id] = { ...state, condition };
        dirty = true;
      }
    }
    if (dirty) builder.updateHeya(heya.id, { infrastructure: next });
  }
  return builder.build();
}

/**
 * REPAIR_INFRASTRUCTURE — refurbish a worn facility back to 100% condition.
 */
export function repairFacility(
  world: WorldState,
  heyaId: Id,
  facilityId: FacilityId
): StateImpact {
  const builder = createImpactBuilder("repairFacility");
  const heya = world.heyas.get(heyaId);
  const state = heya?.infrastructure?.[facilityId];
  const def = FACILITY_REGISTRY[facilityId];
  if (!heya || !state || state.status !== "active" || !def) return builder.build();
  const condition = state.condition ?? 100;
  if (condition >= 100) return builder.build();
  const cost = repairCostFor(def, condition);
  if ((heya.funds ?? 0) < cost) return builder.build();

  builder.updateHeya(heyaId, {
    funds: Math.round(heya.funds - cost),
    infrastructure: { ...heya.infrastructure, [facilityId]: { ...state, condition: 100 } },
  });
  builder.logEvent(
    "FACILITY_UPGRADED",
    "facility",
    {
      facilityId,
      cost,
      fromCondition: condition,
    },
    { heyaId }
  );
  return builder.build();
}
