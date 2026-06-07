/**
 * Health and injury constants.
 */

/** Maximum injury severity */
export const MAX_INJURY_SEVERITY = 100;

/** Maximum fatigue value */
export const MAX_FATIGUE = 100;

/** Minimum fatigue value */
export const MIN_FATIGUE = 0;

/** Maximum health value */
export const MAX_HEALTH = 100;

/** Minimum health value */
export const MIN_HEALTH = 0;

/** Maximum mental stat value */
export const MAX_MENTAL_STAT = 100;

/** Minimum mental stat value */
export const MIN_MENTAL_STAT = 1;

/** Default mental stat value */
export const DEFAULT_MENTAL_STAT = 50;

// Recovery multiplier threshold
export const RECOVERY_MULTIPLIER_THRESHOLD = 1.2;

// Body part ranges (for injury targeting)
export const BODY_PART_HEAD_RANGE = [0, 15];
export const BODY_PART_NECK_RANGE = [15, 30];
export const BODY_PART_SHOULDERS_RANGE = [30, 45];
export const BODY_PART_ARMS_RANGE = [45, 60];
export const BODY_PART_CHEST_RANGE = [60, 75];
export const BODY_PART_LEGS_RANGE = [75, 90];
export const BODY_PART_OTHER_RANGE = [90, 100];
