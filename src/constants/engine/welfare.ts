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

// Injury pressure values
export const INJURY_PRESSURE_SERIOUS = 8;
export const INJURY_PRESSURE_MODERATE = 4;
export const INJURY_PRESSURE_MINOR = 2;

// Welfare pressure calculations
export const WELFARE_PRESSURE_DIVISOR = 3;
export const WELFARE_DELTA_MAX = 12;

// Welfare modifiers
export const WELFARE_SERIOUS_INJURY_BONUS = 2;
export const WELFARE_AUSTERITY_DIET_BONUS = 2;
export const WELFARE_PREMIUM_DIET_REDUCTION = 1;
export const WELFARE_NEGLIGENCE_PENALTY_MULTIPLIER = 3;
export const WELFARE_PUNISHING_INTENSITY_BONUS = 3;
export const WELFARE_INTENSIVE_INTENSITY_BONUS = 1;
export const WELFARE_LOW_RECOVERY_BONUS = 2;
export const WELFARE_HIGH_RECOVERY_REDUCTION = 2;
export const WELFARE_SCANDAL_SYNERGY_BONUS = 2;
export const WELFARE_HEALTHY_DRIFT_REDUCTION = 2;

// Facility quality calculations
export const FACILITY_RECOVERY_QUALITY_BASE = 60;
export const FACILITY_RECOVERY_DIVISOR = 25;
export const FACILITY_NUTRITION_QUALITY_BASE = 55;
export const FACILITY_NUTRITION_DIVISOR = 40;

// Scandal threshold
export const SCANDAL_WELFARE_THRESHOLD = 50;

// Morale constants
export const DEFAULT_MORALE = 50;
export const MORALE_WELFARE_RISK_WEIGHT = 0.6;
export const MORALE_MOMENTUM_NORMALIZER = 4;
export const MORALE_MOMENTUM_OFFSET = 5;
export const MORALE_SANCTIONED_PENALTY = 15;
export const MORALE_INVESTIGATION_PENALTY = 10;
export const MORALE_WATCH_PENALTY = 5;
export const MAX_MORALE = 100;
