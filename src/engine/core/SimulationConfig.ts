/**
 * SimulationConfig.ts — Centralized authority for simulation constants.
 * All magic numbers and business rules are externalized here.
 */

export const SIMULATION_CONFIG = {
  /** Prize amounts (Jillian-standard) */
  prizes: {
    yusho: 10_000_000,
    junYusho: 2_000_000,
    specialPrize: 2_000_000,
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
  }
};

/**
 * Historical/Calender constants
 */
export const BASHO_MONTHS = [1, 3, 5, 7, 9, 11];
export const BASHO_NAMES = ["hatsu", "haru", "natsu", "nagoya", "aki", "kyushu"] as const;
