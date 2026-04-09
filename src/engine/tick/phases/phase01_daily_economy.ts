/**
 * phase01_daily_economy.ts
 * ========================
 * Pipeline Phase 1 (Daily) — Daily overheads (Food).
 */

import type { WorldState } from "../../types/world";
import { WelfareService } from "../../systems/welfare/WelfareService";
import { stableSort } from "../../utils/sort";

const DIET_COSTS: Record<string, number> = {
  austerity: 1000,
  maintenance: 3000,
  heavy_bulk: 6000,
  premium: 10000
};

export function phase01_daily_economy(world: WorldState): WorldState {
  const nextHeyas = new Map(world.heyas);
  let totalDailyFoodCost = 0;

  for (const [id, heya] of world.heyas) {
    const welfare = WelfareService.ensureHeyaWelfareState(heya);
    const diet = welfare.activeDiet || "maintenance";
    const costPerRikishi = DIET_COSTS[diet] ?? 3000;
    const dailyFoodCost = (heya.rikishiIds?.length ?? 0) * costPerRikishi;
    
    totalDailyFoodCost += dailyFoodCost;
    nextHeyas.set(id, { ...heya, funds: heya.funds - dailyFoodCost });
  }

  // Record in deltas
  const deltas = {
    ...(world.transientContext?.deltas ?? {}),
    expenses: (world.transientContext?.deltas.expenses ?? 0) + totalDailyFoodCost
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
