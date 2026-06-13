/**
 * phase01_week_economy.ts
 * ========================
 * Pipeline Phase 1 (Weekly) — Weekly finances (salaries, koenkai, facilities, staff).
 */

import type { WorldState } from "../../types/world";
import { createImpactBuilder } from "../../core/ImpactBuilder";
import type { StateImpact } from "../../core/StateImpact";
import { calculateHeyaWeeklyFinances } from "../../systems/economy/FinanceCalculator";
import { RUNWAY_THRESHOLDS, RUNWAY_BANDS } from "../../../constants/engine/economy";
import type { RunwayBand } from "../../types/narrative";

function runwayMonthsToBand(runwayMonths: number): RunwayBand {
  if (runwayMonths >= RUNWAY_THRESHOLDS.SECURE) return RUNWAY_BANDS.SECURE;
  if (runwayMonths >= RUNWAY_THRESHOLDS.COMFORTABLE) return RUNWAY_BANDS.COMFORTABLE;
  if (runwayMonths >= RUNWAY_THRESHOLDS.TIGHT) return RUNWAY_BANDS.TIGHT;
  if (runwayMonths >= RUNWAY_THRESHOLDS.CRITICAL) return RUNWAY_BANDS.CRITICAL;
  return RUNWAY_BANDS.DESPERATE;
}

export function phase01_week_economy(world: WorldState): StateImpact {
  const builder = createImpactBuilder("phase01_week_economy");

  // Process weekly finances for each heya
  for (const [id, heya] of world.heyas) {
    const financeResult = calculateHeyaWeeklyFinances(heya, world);
    builder.updateHeya(id, {
      funds: financeResult.nextFunds,
      runwayBand: runwayMonthsToBand(financeResult.runwayMonths),
    });
  }

  return builder.build();
}
