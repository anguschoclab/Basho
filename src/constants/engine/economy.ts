/**
 * Economy and financial constants.
 */

/** Runway band thresholds (in weeks of operating expenses) */
export const RUNWAY_THRESHOLDS = {
  /** Secure runway */
  SECURE: 12,
  /** Comfortable runway */
  COMFORTABLE: 6,
  /** Tight runway */
  TIGHT: 3,
  /** Critical runway */
  CRITICAL: 1,
} as const;

/** Runway band labels */
export const RUNWAY_BANDS = {
  SECURE: "secure",
  COMFORTABLE: "comfortable",
  TIGHT: "tight",
  CRITICAL: "critical",
  DESPERATE: "desperate",
} as const;

// Market constants
export const MARKET_DRIFT_RANGE = 0.06;
export const STOCK_PRICE_ROUNDING = 10000;

// Runway months thresholds
export const RUNWAY_MONTHS_STANDARD = 12;
export const RUNWAY_MONTHS_RISK_TAKER = 6;

// Months per year
export const MONTHS_PER_YEAR = 12;

// Staff costs
export const STAFF_HIRE_COST = 500000;
export const STAFF_STRONG_BONUS = 0.15;
export const STAFF_MORALE_HIGH_MULTIPLIER = 1.15;
export const STAFF_MORALE_LOW_MULTIPLIER = 0.6;
export const STAFF_MORALE_HIGH_THRESHOLD = 90;
export const STAFF_MORALE_LOW_THRESHOLD = 30;

