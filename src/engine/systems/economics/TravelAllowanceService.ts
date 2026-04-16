/**
 * TravelAllowanceService.ts
 * =======================
 * Manages travel/jungyo (regional tour) allowances for sekitori.
 *
 * Sekitori receive travel allowances for regional tours, adding
 * ~¥450K–¥1.5M/year depending on rank. This is paid by the JSA.
 */

import type { WorldState } from "../../types/world";
import type { StateImpact } from "../../core/StateImpact";
import { createImpactBuilder } from "../../core/ImpactBuilder";
import {
  TRAVEL_ALLOWANCE_YEARLY,
  TSUKEBITO_COSTS_MONTHLY,
  KOENKAI_INCOME_SPLIT,
} from "../../constants/EconomicConstants";
import { calculateKoenkaiIncome } from "../economics/SponsorshipService";

/**
 * Pay travel/jungyo allowance to sekitori.
 * Called monthly (1/12 of yearly allowance per month).
 */
export function payTravelAllowance(world: WorldState): StateImpact {
  const builder = createImpactBuilder("payTravelAllowance");

  for (const [rikishiId, rikishi] of world.rikishi) {
    if (rikishi.isRetired) continue;

    // Only sekitori receive travel allowance
    if (rikishi.division !== "makuuchi" && rikishi.division !== "juryo") {
      continue;
    }

    const yearlyAllowance =
      TRAVEL_ALLOWANCE_YEARLY[rikishi.rank as keyof typeof TRAVEL_ALLOWANCE_YEARLY] || 0;
    const monthlyAllowance = yearlyAllowance / 12;

    if (monthlyAllowance <= 0) continue;

    const economics = rikishi.economics || {
      cash: 0,
      retirementFund: 0,
      careerKenshoWon: 0,
      kinboshiCount: 0,
      totalEarnings: 0,
      currentBashoEarnings: 0,
      popularity: 50,
    };

    // Split allowance: 70% cash, 30% retirement fund (JSA model)
    const cashAllowance = monthlyAllowance * 0.7;
    const retirementAllowance = monthlyAllowance * 0.3;

    builder.updateRikishi(rikishiId, {
      economics: {
        ...economics,
        cash: economics.cash + cashAllowance,
        retirementFund: economics.retirementFund + retirementAllowance,
        totalEarnings: economics.totalEarnings + monthlyAllowance,
      },
    });
  }

  return builder.build();
}

/**
 * Deduct tsukebito (personal attendant) costs from sekitori.
 * Called monthly - sekitori pay for their personal attendants.
 */
export function deductTsukebitoCosts(world: WorldState): StateImpact {
  const builder = createImpactBuilder("deductTsukebitoCosts");

  for (const [rikishiId, rikishi] of world.rikishi) {
    if (rikishi.isRetired) continue;

    // Only sekitori have tsukebito
    if (rikishi.division !== "makuuchi" && rikishi.division !== "juryo") {
      continue;
    }

    const monthlyCost =
      TSUKEBITO_COSTS_MONTHLY[rikishi.rank as keyof typeof TSUKEBITO_COSTS_MONTHLY] || 0;

    if (monthlyCost <= 0) continue;

    const economics = rikishi.economics || {
      cash: 0,
      retirementFund: 0,
      careerKenshoWon: 0,
      kinboshiCount: 0,
      totalEarnings: 0,
      currentBashoEarnings: 0,
      popularity: 50,
    };

    // Deduct from cash (personal expense)
    builder.updateRikishi(rikishiId, {
      economics: {
        ...economics,
        cash: Math.max(0, economics.cash - monthlyCost),
      },
    });
  }

  return builder.build();
}

/**
 * Distribute kōenkai income portion to sekitori.
 * Called monthly - 30% of kōenkai income goes to sekitori (split evenly among them).
 */
export function distributeKoenkaiToSekitori(world: WorldState): StateImpact {
  const builder = createImpactBuilder("distributeKoenkaiToSekitori");

  for (const [, heya] of world.heyas) {
    const monthlyKoenkai = calculateKoenkaiIncome(heya.koenkaiBand ?? "none");
    const sekitoriPortion = monthlyKoenkai * KOENKAI_INCOME_SPLIT.sekitoriPortion;

    if (sekitoriPortion <= 0) continue;

    // Count sekitori in this heya
    const sekitoriCount =
      heya.rikishiIds?.filter((rId) => {
        const r = world.rikishi.get(rId);
        return r && !r.isRetired && (r.division === "makuuchi" || r.division === "juryo");
      }).length || 0;

    if (sekitoriCount === 0) continue;

    // Split evenly among sekitori
    const perSekitori = sekitoriPortion / sekitoriCount;

    for (const rId of heya.rikishiIds || []) {
      const r = world.rikishi.get(rId);
      if (!r || r.isRetired) continue;
      if (r.division !== "makuuchi" && r.division !== "juryo") continue;

      const economics = r.economics || {
        cash: 0,
        retirementFund: 0,
        careerKenshoWon: 0,
        kinboshiCount: 0,
        totalEarnings: 0,
        currentBashoEarnings: 0,
        popularity: 50,
      };

      // Add to cash (personal income)
      builder.updateRikishi(rId, {
        economics: {
          ...economics,
          cash: economics.cash + perSekitori,
          totalEarnings: economics.totalEarnings + perSekitori,
        },
      });
    }
  }

  return builder.build();
}
