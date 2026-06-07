/**
 * Welfare Thresholds Constants
 * ============================
 * Constants governing welfare compliance transitions and sanctions.
 */

// Watch thresholds
export const WATCH_THRESHOLD_STANDARD = 30;
export const WATCH_THRESHOLD_NEGLIGENT = 45;
export const WATCH_RISK_NEGLIGENT_THRESHOLD = 20;

// Media pressure levels
export const MEDIA_PRESSURE_LOW = 15;
export const MEDIA_PRESSURE_MEDIUM = 30;
export const MEDIA_PRESSURE_HIGH = 50;

// Risk severity thresholds
export const RISK_HIGH_SEVERITY = 80;
export const RISK_MEDIUM_SEVERITY = 72;

// Investigation progress
export const PROGRESS_GAIN_BASE = 4;
export const PROGRESS_GAIN_DIVISOR = 30;
export const PROGRESS_GAIN_MIN = 2;
export const PROGRESS_GAIN_MAX = 12;
export const INVESTIGATION_PROGRESS_COMPLETE = 100;

// Investigation risk thresholds
export const INVESTIGATION_RISK_CRITICAL = 85;
export const INVESTIGATION_RISK_SERIOUS = 70;
export const INVESTIGATION_RISK_CLEARED = 50;
export const SERIOUS_COUNT_THRESHOLD = 3;

// Low risk threshold
export const RISK_LOW_THRESHOLD = 25;

// Weeks in state minimum
export const WEEKS_IN_STATE_MIN = 3;

// Recruitment freeze
export const RECRUITMENT_FREEZE_WEEKS = 12;

// Scandal decay rates
export const SCANDAL_DECAY_SMALL = 5;
export const SCANDAL_DECAY_MEDIUM = 3;
export const SCANDAL_DECAY_LARGE = 2;

// Political capital thresholds
export const SCANDAL_TRADITIONALIST_THRESHOLD = 10;
export const POLITICAL_CAPITAL_TRADITIONALIST_THRESHOLD = 15;
export const POLITICAL_SPEND_MAX = 15;
export const SCANDAL_WARNING_THRESHOLD = 15;
export const POLITICAL_CAPITAL_WARNING_THRESHOLD = 25;
