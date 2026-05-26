/**
 * Extended calendar and time system constants.
 */

/** Days in each month (non-leap year) */
export const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;

/** Default max day for invalid month */
export const DEFAULT_MAX_DAY = 30;

/** Interim warning threshold (days) */
export const INTERIM_WARNING_THRESHOLD = 14;

/** Basho months (1-indexed) */
export const BASHO_MONTHS = [1, 3, 5, 7, 9, 11] as const;

/** Maximum month number */
export const MAX_MONTH = 12;

/** Week number for election */
export const ELECTION_WEEK_NUMBER = 52;

/** Minimum total moves for era drift analysis */
export const ERA_DRIFT_MIN_MOVES = 100;

/** Dominance ratio threshold for era tone change */
export const DOMINANCE_RATIO_THRESHOLD = 0.35;

/** Default drift value */
export const DEFAULT_DRIFT_VALUE = 1.0;

/** Dominant family drift growth multiplier */
export const DOMINANT_FAMILY_DRIFT_GROWTH = 1.02;

/** Non-dominant family drift decay multiplier */
export const NON_DOMINANT_FAMILY_DRIFT_DECAY = 0.98;

/** Minimum drift clamp value */
export const MIN_DRIFT_CLAMP = 0.5;

/** Maximum drift clamp value */
export const MAX_DRIFT_CLAMP = 2.0;
