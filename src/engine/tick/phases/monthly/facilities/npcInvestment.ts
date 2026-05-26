/**
 * npcInvestment.ts
 * ================
 * NPC auto-investment in facilities.
 * Extracted from phase05_monthly_boundary.ts for modularity.
 */

import type { WorldState } from "../../../../types/world";
import type { Heya } from "../../../../types/heya";
import type { HeyaUpdates } from "../types";
import type { ImpactBuilder } from "../../../../core/ImpactBuilder";
import { computeFacilitiesBand, type FacilityAxis } from "../../../../facilities";
import {
  NPC_INVESTMENT_RUNWAY_THRESHOLD,
  MAX_FACILITY_LEVEL,
  NPC_MAX_INVESTMENT_POINTS,
  FACILITY_UPGRADE_BASE_COST,
  FACILITY_UPGRADE_COST_MULTIPLIERS,
} from "../../../../../constants/engine/facilities";

export function processNpcAutoInvestment(
  world: WorldState,
  heya: Heya,
  totalExpenses: number,
  maintenance: number,
  heyaUpdates: HeyaUpdates,
  builder: ImpactBuilder
): void {
  if (heya.id !== world.playerHeyaId) {
    const monthlyBurn = Math.max(1, totalExpenses + maintenance);
    const currentFunds = heyaUpdates.funds ?? heya.funds ?? 0;
    const runway = currentFunds / monthlyBurn;

    if (runway > NPC_INVESTMENT_RUNWAY_THRESHOLD) {
      const facilities = heya.facilities;
      const axes: FacilityAxis[] = ["training", "recovery", "nutrition"];
      const weakestAxis = axes.reduce(
        (min, axis) => (facilities[axis] < facilities[min] ? axis : min),
        axes[0]
      );

      const currentLevel = facilities[weakestAxis];

      const desiredPoints = Math.min(NPC_MAX_INVESTMENT_POINTS, MAX_FACILITY_LEVEL - currentLevel);

      if (desiredPoints > 0) {
        let upgradeCost = 0;
        let points = 0;

        for (let i = 0; i < desiredPoints; i++) {
          const level = currentLevel + i;
          let cost = FACILITY_UPGRADE_BASE_COST;
          if (level >= FACILITY_UPGRADE_COST_MULTIPLIERS.LEVEL_40)
            cost = FACILITY_UPGRADE_BASE_COST * FACILITY_UPGRADE_COST_MULTIPLIERS.MULTIPLIER_40;
          if (level >= FACILITY_UPGRADE_COST_MULTIPLIERS.LEVEL_60)
            cost = FACILITY_UPGRADE_BASE_COST * FACILITY_UPGRADE_COST_MULTIPLIERS.MULTIPLIER_60;
          if (level >= FACILITY_UPGRADE_COST_MULTIPLIERS.LEVEL_80)
            cost = FACILITY_UPGRADE_BASE_COST * FACILITY_UPGRADE_COST_MULTIPLIERS.MULTIPLIER_80;

          if (currentFunds >= upgradeCost + cost) {
            upgradeCost += cost;
            points++;
          } else {
            break;
          }
        }

        if (points > 0 && upgradeCost > 0) {
          heyaUpdates.funds = currentFunds - upgradeCost;
          heyaUpdates.facilities = {
            ...facilities,
            [weakestAxis]: Math.min(MAX_FACILITY_LEVEL, currentLevel + points),
          };
          heyaUpdates.facilitiesBand = computeFacilitiesBand({
            ...heya,
            facilities: heyaUpdates.facilities,
          });
          builder.logEvent(
            "FACILITY_UPGRADED",
            "economy",
            {
              heyaname: heya.name,
              axis: weakestAxis,
              from: currentLevel,
              to: currentLevel + points,
              cost: upgradeCost,
            },
            { heyaId: heya.id, importance: "notable" }
          );
        }
      }
    }
  }
}
