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

    if (runway > 6) {
      const facilities = heya.facilities;
      const axes: FacilityAxis[] = ["training", "recovery", "nutrition"];
      const weakestAxis = axes.reduce(
        (min, axis) => (facilities[axis] < facilities[min] ? axis : min),
        axes[0]
      );

      const currentLevel = facilities[weakestAxis];
      const maxLevel = 100;

      const maxPoints = 5;
      const desiredPoints = Math.min(maxPoints, maxLevel - currentLevel);

      if (desiredPoints > 0) {
        const baseCost = 200_000;
        let upgradeCost = 0;
        let points = 0;

        for (let i = 0; i < desiredPoints; i++) {
          const level = currentLevel + i;
          let cost = baseCost;
          if (level >= 40) cost = baseCost * 1.5;
          if (level >= 60) cost = baseCost * 2.5;
          if (level >= 80) cost = baseCost * 4;

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
            [weakestAxis]: Math.min(maxLevel, currentLevel + points),
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
