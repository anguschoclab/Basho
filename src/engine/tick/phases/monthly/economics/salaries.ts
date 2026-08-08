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
import { getRikishi } from "../../../../queries";
import {
  SEKITORI_OVERHEAD_MONTHLY,
  NON_SEKITORI_OVERHEAD_MONTHLY,
} from "../../../../../constants/engine/economic";

/**
 * Process monthly heya economics:
 * 1. Credit sekitori with their JSA salary payments (to the rikishi, not from heya).
 * 2. Deduct rank-scaled operating overhead from heya.funds — this is the heya-side
 *    cost of fielding a roster (training resources, tsukebito coordination, ring time,
 *    travel logistics) that scales with roster strength and is NOT covered by the JSA
 *    salary credit. This is the structural sink that prevents NPC funds from compounding
 *    without bound.
 *
 * Returns total monthly burn (salaries + overhead) so phase05 can compute runway.
 */
export function processHeyaEconomics(
  world: WorldState,
  heya: Heya,
  rikishiMap: Map<string, Rikishi>,
  heyaUpdates: HeyaUpdates,
  builder: ImpactBuilder
): number {
  let totalJsaSalaries = 0;
  let totalHeyaOverhead = 0;
  const rikishiIds = [...new Set(heya.rikishiIds ?? [])];

  for (const rId of rikishiIds) {
    const r = rikishiMap.get(rId) || getRikishi(world, rId);
    if (!r) continue;

    const info = RANK_HIERARCHY[r.rank];
    if (!info) {
      // Unknown rank (e.g. corrupted save with unvalidated rank string).
      // Charge flat non-sekitori overhead so the rikishi is never a free rider.
      totalHeyaOverhead += NON_SEKITORI_OVERHEAD_MONTHLY;
      continue;
    }

    if (info.isSekitori) {
      // Credit salary to the rikishi (paid by JSA, not deducted from heya)
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

      // Rank-scaled heya overhead for sekitori
      totalHeyaOverhead +=
        SEKITORI_OVERHEAD_MONTHLY[r.rank as keyof typeof SEKITORI_OVERHEAD_MONTHLY] ?? 0;
    } else {
      // Flat overhead for non-sekitori
      totalHeyaOverhead += NON_SEKITORI_OVERHEAD_MONTHLY;
    }
  }

  // Deduct operating overhead from heya funds — this is a genuine heya expense
  // that scales with roster strength, creating financial pressure on weak stables.
  heyaUpdates.funds = (heyaUpdates.funds ?? heya.funds ?? 0) - totalHeyaOverhead;

  return totalJsaSalaries + totalHeyaOverhead;
}
