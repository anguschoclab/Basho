/**
 * salaries.ts
 * ===========
 * Monthly salary and staff cost processing.
 * Extracted from phase05_monthly_boundary.ts for modularity.
 */

import type { WorldState } from "../../../../types/world";
import type { Heya } from "../../../../types/heya";
import type { Rikishi } from "../../../../types/rikishi";
import type { HeyaUpdates } from "../types";
import type { ImpactBuilder } from "../../../../core/ImpactBuilder";
import { RANK_HIERARCHY } from "../../../../banzuke";

// JSA pays oyakata salaries, facility upkeep, and non-sekitori allowances directly.
// Heya funds are managed by FinanceCalculator (weekly) which already accounts for all
// heya-side expenses (facility upkeep, staff, JSA subsidies).
// This function's only job is to credit sekitori with their monthly JSA salary payments.
export function processHeyaEconomics(
  world: WorldState,
  heya: Heya,
  rikishiMap: Map<string, Rikishi>,
  _heyaUpdates: HeyaUpdates,
  builder: ImpactBuilder
): number {
  let totalJsaSalaries = 0;
  const rikishiIds = heya.rikishiIds ?? [];

  for (const rId of rikishiIds) {
    const r = rikishiMap.get(rId) || world.rikishi.get(rId);
    if (!r) continue;

    const info = RANK_HIERARCHY[r.rank];
    if (!info?.isSekitori) continue;

    const baseSalary = info.salary ?? 0;
    const economics = r.economics || {
      cash: 0,
      retirementFund: 0,
      careerKenshoWon: 0,
      kinboshiCount: 0,
      totalEarnings: 0,
      currentBashoEarnings: 0,
      popularity: 50,
    };

    builder.updateRikishi(rId, {
      economics: {
        ...economics,
        cash: economics.cash + baseSalary,
        totalEarnings: economics.totalEarnings + baseSalary,
      },
    });
    totalJsaSalaries += baseSalary;
  }

  // Do NOT deduct from heya.funds — FinanceCalculator (weekly) owns all heya expenses.
  return totalJsaSalaries;
}
