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
