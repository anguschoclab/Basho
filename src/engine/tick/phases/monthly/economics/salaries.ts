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
import { getHeyaStaffBonuses } from "../../../../staff";
import { OYAKATA_SALARY_MONTHLY, FACILITY_UPKEEP } from "../../../../constants/EconomicConstants";

export function processHeyaEconomics(
  world: WorldState,
  heya: Heya,
  rikishiMap: Map<string, Rikishi>,
  heyaUpdates: HeyaUpdates,
  builder: ImpactBuilder
): number {
  let totalSalaries = 0;
  const rikishiIds = heya.rikishiIds ?? [];

  for (const rId of rikishiIds) {
    const r = rikishiMap.get(rId) || world.rikishi.get(rId);
    if (!r) continue;

    const info = RANK_HIERARCHY[r.rank];
    if (info?.isSekitori) {
      const baseSalary = info.salary ?? 0;
      // NOTE: Kinboshi stipend is now paid per-basho in CompetitionService, not monthly
      const totalRikishiPay = baseSalary;

      const economics = r.economics || {
        cash: 0,
        retirementFund: 0,
        careerKenshoWon: 0,
        kinboshiCount: 0,
        totalEarnings: 0,
        currentBashoEarnings: 0,
        popularity: 50,
      };

      // Use ImpactBuilder to update rikishi economics
      builder.updateRikishi(rId, {
        economics: {
          ...economics,
          cash: economics.cash + totalRikishiPay,
          totalEarnings: economics.totalEarnings + totalRikishiPay,
        },
      });
      totalSalaries += totalRikishiPay;
    } else {
      totalSalaries += 70_000;
    }
  }

  const staffBonuses = getHeyaStaffBonuses(world, heya.id);
  const oyakataSalary = OYAKATA_SALARY_MONTHLY * staffBonuses.administration;
  const facilityUpkeep =
    (heya.facilities.training * FACILITY_UPKEEP.training * 4 +
      heya.facilities.recovery * FACILITY_UPKEEP.recovery * 4 +
      heya.facilities.nutrition * FACILITY_UPKEEP.nutrition * 4) *
    staffBonuses.administration;
  const totalExpenses = totalSalaries + facilityUpkeep + oyakataSalary;

  heyaUpdates.funds = (heya.funds ?? 0) - totalExpenses;

  return totalExpenses;
}
