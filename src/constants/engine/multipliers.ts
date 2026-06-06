/**
 * Multiplier constants for game calculations.
 */

/** Facility-based training multipliers */
export const TRAINING_MULTIPLIERS = {
  /** Base training multiplier */
  BASE: 0.85,
  /** Maximum additional multiplier from facility level */
  RANGE: 0.35,
} as const;

/** Facility-based recovery multipliers */
export const FACILITY_RECOVERY_MULTIPLIERS = {
  /** Base recovery multiplier */
  BASE: 0.8,
  /** Maximum additional multiplier from facility level */
  RANGE: 0.4,
} as const;

/** Nutrition multipliers */
export const NUTRITION_MULTIPLIERS = {
  /** Base nutrition multiplier */
  BASE: 0.92,
  /** Maximum additional multiplier from facility level */
  RANGE: 0.16,
} as const;

/** Morale boost multiplier */
export const MORALE_BOOST_MULTIPLIER = 0.15;

/** Financial penalty multiplier */
export const FINANCIAL_PENALTY_MULTIPLIER = 0.5;

/** Training multiplier bounds */
export const TRAINING_MULTIPLIER_BOUNDS = {
  MIN: 0.1,
  MAX: 2.0,
} as const;

/** Recovery multiplier bounds */
export const RECOVERY_MULTIPLIER_BOUNDS = {
  MIN: 0.5,
  MAX: 2.0,
} as const;
