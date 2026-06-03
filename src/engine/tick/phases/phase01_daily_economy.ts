/**
 * phase01_daily_economy.ts
 * ========================
 * Pipeline Phase 1 (Daily) — Daily overheads (Food).
 */

import type { WorldState } from "../../types/world";
import { createImpactBuilder } from "../../core/ImpactBuilder";
import type { StateImpact } from "../../core/StateImpact";
import { WelfareService } from "../../systems/welfare/WelfareService";
import { DIET_COSTS, DEBT_LIMIT } from "../../../constants/engine/economic";
import { DIET_COST_STANDARD } from "../../../constants/engine/economyExtended";

export function phase01_daily_economy(world: WorldState): StateImpact {
  const builder = createImpactBuilder("phase01_daily_economy");
  let totalDailyFoodCost = 0;

  // Only process heyas that have rikishi to deduct food costs
  for (const [id, heya] of world.heyas) {
    const rikishiCount = heya.rikishiIds?.length ?? 0;
    if (rikishiCount === 0) continue; // Skip heyas with no rikishi

    const welfare = WelfareService.ensureHeyaWelfareState(heya);
    const diet = welfare.activeDiet || "maintenance";
    const costPerRikishi = DIET_COSTS[diet] ?? DIET_COST_STANDARD;
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
        revenue: world.transientContext.deltas?.revenue ?? 0,
        expenses: (world.transientContext.deltas?.expenses ?? 0) + totalDailyFoodCost,
        statChanges: world.transientContext.deltas?.statChanges ?? {},
        injuriesSustained: world.transientContext.deltas?.injuriesSustained ?? [],
      },
    };
    builder.updateWorldField("transientContext", nextTransient);
  }

  return builder.build();
}
