/**
 * Condition and health system constants.
 */

/** Default condition value */
export const DEFAULT_CONDITION = 100;

/** Maximum condition value */
export const MAX_CONDITION = 100;

/** Minimum condition value */
export const MIN_CONDITION = 0;

/** Fatigue decay rate per day */
export const FATIGUE_DECAY_RATE = 0.5;

/** Fatigue divisor for decay calculation */
export const FATIGUE_DECAY_DIVISOR = 100;

/** Recovery rate per day (normal) */
export const RECOVERY_RATE_NORMAL = 1.0;

/** Recovery rate per day (slow) */
export const RECOVERY_RATE_SLOW = 0.5;

/** Recovery days from 70 to 100 at normal rate */
export const RECOVERY_DAYS_NORMAL = 30;

/** Minimum weight (kg) */
export const MIN_WEIGHT = 70;

/** Weight loss for starvation diet (kg) */
export const WEIGHT_LOSS_STARVATION = 0.05;

/** Weight gain for high-calorie diet (kg) */
export const WEIGHT_GAIN_HIGH_CALORIE = 0.1;

/** Weight gain for moderate diet (kg) */
export const WEIGHT_GAIN_MODERATE = 0.08;

/** Mental stat loss for starvation diet */
export const MENTAL_LOSS_STARVATION = 0.5;

/** Mental stat loss for poor diet */
export const MENTAL_LOSS_POOR = 0.2;

/** Mental stat gain for good diet */
export const MENTAL_GAIN_GOOD = 0.5;

/** Fatigue recovery for good diet */
export const FATIGUE_RECOVERY_GOOD = 0.3;

/** Fatigue divisor for injury calculation */
export const INJURY_FATIGUE_DIVISOR = 200;

/** Default durability stat */
export const DEFAULT_DURABILITY = 60;

/** Durability multiplier base */
export const DURABILITY_MULTIPLIER_BASE = 1.35;

/** Durability divisor */
export const DURABILITY_DIVISOR = 100;

/** Durability multiplier min */
export const DURABILITY_MULTIPLIER_MIN = 0.6;

/** Maximum weeks out for injury */
export const MAX_WEEKS_OUT = 26;

/** Minimum weeks out for injury */
export const MIN_WEEKS_OUT = 1;

/** Post-bout injury weeks max */
export const POST_BOUT_INJURY_WEEKS_MAX = 2;

/** Post-bout injury weeks min */
export const POST_BOUT_INJURY_WEEKS_MIN = 1;

/** Recovery multiplier threshold for double week reduction */
export const RECOVERY_MULTIPLIER_DOUBLE_WEEK_THRESHOLD = 1.2;

/** Double week reduction value */
export const DOUBLE_WEEK_REDUCTION = 2;

/** Single week reduction value */
export const SINGLE_WEEK_REDUCTION = 1;
