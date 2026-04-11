/**
 * phase01_daily_economy.ts
 * ========================
 * Pipeline Phase 1 (Daily) — Daily overheads (Food).
 */

import type { WorldState } from "../../types/world";
import { WelfareService } from "../../systems/welfare/WelfareService";
import { DIET_COSTS } from "../../constants/EconomicConstants";

export function phase01_daily_economy(world: WorldState): WorldState {
  let totalDailyFoodCost = 0;
  const nextHeyas = new Map(world.heyas);

  // Only process heyas that have rikishi to deduct food costs
  for (const [id, heya] of world.heyas) {
    const rikishiCount = heya.rikishiIds?.length ?? 0;
    if (rikishiCount === 0) continue; // Skip heyas with no rikishi

    const welfare = WelfareService.ensureHeyaWelfareState(heya);
    const diet = welfare.activeDiet || "maintenance";
    const costPerRikishi = DIET_COSTS[diet] ?? 3000;
    const dailyFoodCost = rikishiCount * costPerRikishi;
    
    totalDailyFoodCost += dailyFoodCost;
    nextHeyas.set(id, { ...heya, funds: heya.funds - dailyFoodCost });
  }

  // Record in deltas
  const deltas = {
    ...(world.transientContext?.deltas ?? {}),
    expenses: (world.transientContext?.deltas?.expenses ?? 0) + totalDailyFoodCost
  };

  return {
    ...world,
    heyas: nextHeyas,
    transientContext: {
      ...world.transientContext!,
      deltas: deltas as any
    }
  };
}
