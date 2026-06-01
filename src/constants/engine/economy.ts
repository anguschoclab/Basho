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

/** Weeks-before-expiry window in which a sponsor contract is eligible for auto-renewal */
export const SPONSOR_RENEWAL_WINDOW_WEEKS = 8;

/** Minimum sponsor loyalty required to auto-renew an expiring contract */
export const SPONSOR_MIN_LOYALTY_FOR_RENEWAL = 60;
