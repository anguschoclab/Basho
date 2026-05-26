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
