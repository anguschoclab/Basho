/**
 * Health Assessment Constants
 * ============================
 * Constants governing pre-basho health assessment and rikishi readiness scoring.
 */

// Health score penalties
export const FATIGUE_HEALTH_PENALTY = 0.5;
export const CONDITION_HEALTH_PENALTY = 0.3;
export const STAMINA_HEALTH_PENALTY = 0.2;

// Injury severity penalties
export const INJURY_SERIOUS_PENALTY = 30;
export const INJURY_MINOR_PENALTY = 15;

// Fatigue penalty
export const FATIGUE_HIGH_PENALTY = 15;

// Health score thresholds
export const HEALTH_CRITICAL_THRESHOLD = 40;
export const HEALTH_WARNING_THRESHOLD = 60;
export const HEALTH_CAUTION_THRESHOLD = 50;
export const HEALTH_MINOR_THRESHOLD = 70;

// Assessment timing window
export const ASSESSMENT_DAYS_MIN = 7;
export const ASSESSMENT_DAYS_MAX = 14;
