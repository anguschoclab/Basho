/**
 * Welfare and compliance constants.
 */

/** Maximum welfare risk value */
export const MAX_WELFARE_RISK = 100;

/** Welfare risk threshold for marking as non-compliant */
export const WELFARE_RISK_THRESHOLD = 55;

/** Minimum risk shift to log as material change */
export const WELFARE_RISK_SHIFT_LOG_THRESHOLD = 8;

/** Maximum media pressure value */
export const MAX_MEDIA_PRESSURE = 100;

// Compliance transition thresholds
export const WATCH_THRESHOLD_WITH_NEGLECT = 30;
export const WATCH_THRESHOLD_WITHOUT_NEGLECT = 45;
export const SERIOUS_COUNT_THRESHOLD = 2;
export const NEGLIGENCE_RISK_THRESHOLD = 20;
export const MEDIA_PRESSURE_WATCH = 15;
export const INVESTIGATION_RISK_THRESHOLD = 65;
export const INVESTIGATION_WEEKS_THRESHOLD = 2;
export const INVESTIGATION_SEVERITY_HIGH = 80;
export const INVESTIGATION_SEVERITY_MEDIUM = 72;
export const MEDIA_PRESSURE_INVESTIGATION = 30;
export const CLEAR_RISK_THRESHOLD = 25;
export const CLEAR_WEEKS_THRESHOLD = 3;
export const PROGRESS_GAIN_BASE = 4;
export const PROGRESS_GAIN_DIVISOR = 30;
export const PROGRESS_GAIN_MIN = 2;
export const PROGRESS_GAIN_MAX = 12;
export const SANCTION_RISK_THRESHOLD = 85;
export const SANCTION_SERIOUS_COUNT = 3;
export const SANCTION_RISK_WITH_SERIOUS = 70;
export const INVESTIGATION_COMPLETE_PROGRESS = 100;
export const INVESTIGATION_CLOSE_RISK_THRESHOLD = 50;
export const SANCTION_FINE_YEN = 5_000_000;
export const RECRUITMENT_FREEZE_WEEKS = 12;
export const MEDIA_PRESSURE_SANCTION = 50;
export const SANCTION_LIFT_RISK_THRESHOLD = 45;
export const SANCTION_LIFT_WEEKS_THRESHOLD = 4;
