/**
 * phase01_week_economy.ts
 * ========================
 * Pipeline Phase 1 (Weekly) — Weekly finances (salaries, koenkai, facilities, staff).
 */

import type { WorldState } from "../../types/world";
import { createImpactBuilder } from "../../core/ImpactBuilder";
import type { StateImpact } from "../../core/StateImpact";
import { calculateHeyaWeeklyFinances } from "../../systems/economy/FinanceCalculator";

export function phase01_week_economy(world: WorldState): StateImpact {
  const builder = createImpactBuilder("phase01_week_economy");

  // Process weekly finances for each heya
  for (const [id, heya] of world.heyas) {
    const financeResult = calculateHeyaWeeklyFinances(heya, world);
    builder.updateHeya(id, { funds: financeResult.nextFunds });
  }

  return builder.build();
}
