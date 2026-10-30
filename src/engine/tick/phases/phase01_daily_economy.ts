/**
 * phase01_daily_economy.ts
 * ========================
 * Pipeline Phase 1 (Daily) — Daily overheads (Food).
 */

import type { WorldState } from "@/engine/types/world";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import type { StateImpact } from "@/engine/core/StateImpact";
import { WelfareService } from "@/engine/welfare/WelfareService";
import { DIET_COSTS, DEBT_LIMIT } from "@/constants/engine/economic";
import { DIET_COST_STANDARD } from "@/constants/engine/economyExtended";

export function phase01_daily_economy(world: WorldState): StateImpact {
  const builder = createImpactBuilder("phase01_daily_economy");
  let totalDailyFoodCost = 0;

  // Only process heyas that have rikishi to deduct food costs
  for (const [id, heya] of world.heyas) {
    const rikishiCount = new Set(heya.rikishiIds ?? []).size;
    if (rikishiCount === 0) continue; // Skip heyas with no rikishi

    const welfare = WelfareService.ensureHeyaWelfareState(heya);
    const heyaDiet = welfare.activeDiet || "maintenance";
    // P3: per-rikishi diet override — each rikishi costs by his own regimen,
    // falling back to the heya default.
    const rikishiMap = world.rikishi;
    let dailyFoodCost = 0;
    for (const rid of new Set(heya.rikishiIds ?? [])) {
      const diet = rikishiMap.get(rid)?.diet ?? heyaDiet;
      dailyFoodCost += DIET_COSTS[diet] ?? DIET_COST_STANDARD;
    }
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
