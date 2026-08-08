/**
 * SimulationConfig.ts — Centralized authority for simulation constants.
 * All magic numbers and business rules are externalized here.
 */

import type { Division } from "../types/banzuke";

export const SIMULATION_CONFIG = {
  /** Prize amounts (2027 JSA revision) */
  prizes: {
    yusho: 20_000_000,
    yushoByDivision: {
      makuuchi: 20_000_000,
      juryo: 3_000_000,
      makushita: 700_000,
      sandanme: 500_000,
      jonidan: 300_000,
      jonokuchi: 200_000,
    } as Record<Division, number>,
    junYusho: 2_000_000,
    specialPrize: 3_000_000,
    kinboshiStipend: 40_000, // Per kinboshi per basho
  },

  /** Career milestones */
  milestones: {
    wins: [100, 200, 300, 500, 1000],
    hofWins: 500,
  },

  /** Recruitment windows */
  recruitment: {
    durationWeeks: 4,
    playerHeyaRosterCap: 30, // Reference to overflow cap
  },

  /** Media impact baseline shifts */
  media: {
    baseBoutHeatIncrease: 1.2,
    baseBoutHeatDecay: 0.85,
    governanceHeadlineChance: 0.05,
  },

  /** Injury baselines */
  injuries: {
    weeklyBaseChance: 0.005,
    maxWeeklyChance: 0.12,
    boutBaseChance: 0.008,
    maxBoutChance: 0.06,
  },
};

/**
 * Historical/Calender constants
 */
export const BASHO_MONTHS = [1, 3, 5, 7, 9, 11];
export const BASHO_NAMES = ["hatsu", "haru", "natsu", "nagoya", "aki", "kyushu"] as const;
