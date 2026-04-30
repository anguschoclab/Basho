/**
 * phase01_daily_economy.ts
 * ========================
 * Pipeline Phase 1 (Daily) — Daily overheads (Food).
 */

import type { WorldState } from "../../types/world";
import { createImpactBuilder } from "../../core/ImpactBuilder";
import type { StateImpact } from "../../core/StateImpact";
import { WelfareService } from "../../systems/welfare/WelfareService";
import { DIET_COSTS, DEBT_LIMIT } from "../../constants/EconomicConstants";

export function phase01_daily_economy(world: WorldState): StateImpact {
  const builder = createImpactBuilder('phase01_daily_economy');
  let totalDailyFoodCost = 0;

  // Only process heyas that have rikishi to deduct food costs
  for (const [id, heya] of world.heyas) {
    const rikishiCount = heya.rikishiIds?.length ?? 0;
    if (rikishiCount === 0) continue; // Skip heyas with no rikishi

    const welfare = WelfareService.ensureHeyaWelfareState(heya);
    const diet = welfare.activeDiet || "maintenance";
    const costPerRikishi = DIET_COSTS[diet] ?? 3000;
    const dailyFoodCost = rikishiCount * costPerRikishi;
    const nextFunds = Math.max(DEBT_LIMIT, heya.funds - dailyFoodCost);

    totalDailyFoodCost += dailyFoodCost;
    builder.updateHeya(id, { funds: nextFunds });
  }

  // Update transientContext via builder for pipeline compliance
  if (world.transientContext) {
    const nextTransient = {
      ...world.transientContext,
      deltas: {
        ...(world.transientContext.deltas ?? {}),
        expenses: (world.transientContext.deltas?.expenses ?? 0) + totalDailyFoodCost,
      },
    };
    builder.updateWorldField("transientContext", nextTransient);
  }

  return builder.build();
}
