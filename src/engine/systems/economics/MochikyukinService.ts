/**
 * MochikyukinService.ts
 * =====================
 * Manages the mochikyukin (cumulative bonus) system for sekitori.
 *
 * Mochikyukin is a JSA incentive system where sekitori earn points for:
 * - Kachi-koshi (winning records): 1 point
 * - Yusho (championship): 10 points
 * - Kinboshi (v Yokozuna): 3 points
 * - Jun-yusho (runner-up): 5 points
 *
 * Points accumulate throughout a sekitori's career and are paid out
 * 6 times per year (every 2 months) at ¥4,000 per point.
 * This provides a natural progression mechanic for veteran wrestlers.
 */

import type { WorldState } from "../../types/world";
import type { StateImpact } from "../../core/StateImpact";
import { createImpactBuilder } from "../../core/ImpactBuilder";
import type { Id } from "../../types/common";
import {
import { getRikishi } from "../../queries";
  MOCHIKYUKIN_POINT_VALUE,
  MOCHIKYUKIN_POINTS_KACHI_KOSHI,
  MOCHIKYUKIN_POINTS_YUSHO,
  MOCHIKYUKIN_POINTS_KINBOSHI,
  MOCHIKYUKIN_POINTS_JUN_YUSHO,
} from "../../../constants/engine/economic";

/**
 * Accumulate mochikyukin points for a rikishi based on basho results.
 * Called after each basho concludes.
 */
export function accumulateMochikyukinPoints(
  world: WorldState,
  rikishiId: Id,
  bashoResults: {
    isKachiKoshi: boolean;
    isYusho: boolean;
    isJunYusho: boolean;
    kinboshiEarned: number;
  }
): StateImpact {
  const builder = createImpactBuilder("accumulateMochikyukinPoints");
  const rikishi = getRikishi(world, rikishiId);

  if (!rikishi) return builder.build();

  // Only sekitori (makuuchi + juryo) earn mochikyukin points
  if (rikishi.division !== "makuuchi" && rikishi.division !== "juryo") {
    return builder.build();
  }

  const achievements = rikishi.stats?.achievements || {
    kinboshiEarned: 0,
    ginboshiEarned: 0,
    kinboshiConceded: 0,
    ginboshiConceded: 0,
    specialPrizes: { shukunSho: 0, kantoSho: 0, ginoSho: 0 },
    mochikyukinPoints: 0,
  };

  let pointsEarned = 0;

  // Kachi-koshi (winning record)
  if (bashoResults.isKachiKoshi) {
    pointsEarned += MOCHIKYUKIN_POINTS_KACHI_KOSHI;
  }

  // Yusho (championship)
  if (bashoResults.isYusho) {
    pointsEarned += MOCHIKYUKIN_POINTS_YUSHO;
  }

  // Jun-yusho (runner-up)
  if (bashoResults.isJunYusho) {
    pointsEarned += MOCHIKYUKIN_POINTS_JUN_YUSHO;
  }

  // Kinboshi (v Yokozuna) - only count newly earned kinboshi this basho
  pointsEarned += bashoResults.kinboshiEarned * MOCHIKYUKIN_POINTS_KINBOSHI;

  if (pointsEarned > 0) {
    const updatedAchievements = {
      ...achievements,
      mochikyukinPoints: achievements.mochikyukinPoints + pointsEarned,
    };

    builder.updateRikishi(rikishiId, {
      stats: {
        ...rikishi.stats,
        achievements: updatedAchievements,
      },
    });
  }

  return builder.build();
}

/**
 * Pay out mochikyukin bonuses to sekitori.
 * Called 6 times per year (every 2 months) during monthly boundary.
 */
export function payMochikyukinBonuses(world: WorldState, currentMonth: number): StateImpact {
  const builder = createImpactBuilder("payMochikyukinBonuses");

  // Payout occurs every 2 months (0, 2, 4, 6, 8, 10) for 6 payouts per year
  if (currentMonth % 2 !== 0) {
    return builder.build();
  }

  for (const rikishiId of world.activeRikishiIds) {
    const rikishi = getRikishi(world, rikishiId);
    if (!rikishi) continue;

    // Only sekitori receive mochikyukin payouts
    if (rikishi.division !== "makuuchi" && rikishi.division !== "juryo") {
      continue;
    }

    const achievements = rikishi.stats?.achievements;
    const mochikyukinPoints = achievements?.mochikyukinPoints || 0;

    if (mochikyukinPoints <= 0) continue;

    const payout = mochikyukinPoints * MOCHIKYUKIN_POINT_VALUE;
    const economics = rikishi.economics || {
      cash: 0,
      retirementFund: 0,
      careerKenshoWon: 0,
      kinboshiCount: 0,
      totalEarnings: 0,
      currentBashoEarnings: 0,
      popularity: 50,
    };

    // Split payout: 50% cash, 50% retirement fund (JSA model)
    const cashPayout = payout / 2;
    const retirementPayout = payout / 2;

    builder.updateRikishi(rikishiId, {
      economics: {
        ...economics,
        cash: economics.cash + cashPayout,
        retirementFund: economics.retirementFund + retirementPayout,
        totalEarnings: economics.totalEarnings + payout,
        mochikyukinLastPayoutMonth: currentMonth,
      },
    });
  }

  return builder.build();
}
