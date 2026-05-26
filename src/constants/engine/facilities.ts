/**
 * Facility-related constants.
 */

/** Maximum facility level */
export const MAX_FACILITY_LEVEL = 100;

/** Minimum facility level after decay */
export const MIN_FACILITY_LEVEL = 5;

/** Facility decay amount per month when maintenance is not paid */
export const FACILITY_DECAY_AMOUNT = 2;

/** Maintenance cost multiplier per facility point */
export const MAINTENANCE_COST_PER_POINT = 3000;

/** NPC investment runway threshold (in weeks) */
export const NPC_INVESTMENT_RUNWAY_THRESHOLD = 6;

/** Maximum points NPC can invest in a single month */
export const NPC_MAX_INVESTMENT_POINTS = 5;

/** Base cost for facility upgrade */
export const FACILITY_UPGRADE_BASE_COST = 200_000;

/** Facility upgrade cost multipliers at different levels */
export const FACILITY_UPGRADE_COST_MULTIPLIERS = {
  /** Level threshold for 1.5x cost */
  LEVEL_40: 40,
  /** Level threshold for 2.5x cost */
  LEVEL_60: 60,
  /** Level threshold for 4x cost */
  LEVEL_80: 80,
  /** Cost multiplier at level 40+ */
  MULTIPLIER_40: 1.5,
  /** Cost multiplier at level 60+ */
  MULTIPLIER_60: 2.5,
  /** Cost multiplier at level 80+ */
  MULTIPLIER_80: 4.0,
} as const;
