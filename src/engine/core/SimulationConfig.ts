/**
 * SimulationConfig.ts — Centralized authority for simulation constants.
 * All magic numbers and business rules are externalized here.
 */

export const SIMULATION_CONFIG = {
  // Prize money moved to @/constants/engine/jsaEra — the JSA's July-2026
  // revision changes yusho/sansho amounts by calendar year (effective
  // Hatsu 2027), so the values live behind year-aware getters there.

  /** Career milestones */
  milestones: {
    wins: [100, 200, 300, 500, 1000],
    hofWins: 500,
  },

  /** Recruitment windows */
  recruitment: {
    durationWeeks: 4,
    // No roster cap — the JSA has no legal ceiling on heya size.
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
