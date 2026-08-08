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

/** Base construction cost per facility type (¥). Used by FACILITY_REGISTRY. */
export const FACILITY_BASE_COSTS: Record<string, number> = {
  weights_room: 15_000_000,
  medical_suite: 25_000_000,
  media_studio: 5_000_000,
  traditional_kitchen: 8_000_000,
  video_lab: 12_000_000,
  scouting_office: 18_000_000,
  academy_mongolia: 50_000_000,
  academy_georgia: 45_000_000,
  academy_europe: 40_000_000,
  academy_americas: 40_000_000,
} as const;

/** Monthly maintenance cost per facility type (¥). Used by FACILITY_REGISTRY. */
export const FACILITY_MAINTENANCE_COSTS: Record<string, number> = {
  weights_room: 450_000,
  medical_suite: 800_000,
  media_studio: 150_000,
  traditional_kitchen: 350_000,
  video_lab: 250_000,
  scouting_office: 500_000,
  academy_mongolia: 2_000_000,
  academy_georgia: 1_800_000,
  academy_europe: 1_500_000,
  academy_americas: 1_500_000,
} as const;
