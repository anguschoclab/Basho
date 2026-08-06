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

/** Yen charged per week of injury removed via paid treatment. */
export const TREATMENT_COST_PER_WEEK = 500_000;

// ─────────────────────────────────────────
// Injury severity roll thresholds
// ─────────────────────────────────────────

/** Severity roll threshold for minor injury (below this = minor) */
export const INJURY_SEVERITY_MINOR_THRESHOLD = 0.72;

/** Severity roll threshold for moderate injury (below this = moderate, else serious) */
export const INJURY_SEVERITY_MODERATE_THRESHOLD = 0.95;

// ─────────────────────────────────────────
// Injury area weights
// ─────────────────────────────────────────

/** Probability weights for injury body areas */
export const INJURY_AREA_WEIGHTS = [
  0.18, 0.12, 0.12, 0.1, 0.08, 0.08, 0.08, 0.08, 0.06, 0.1,
] as const;

// ─────────────────────────────────────────
// Injury type roll thresholds
// ─────────────────────────────────────────

/** Serious injury: roll threshold for tear */
export const INJURY_SERIOUS_TEAR_THRESHOLD = 0.35;

/** Serious injury: roll threshold for fracture */
export const INJURY_SERIOUS_FRACTURE_THRESHOLD = 0.65;

/** Moderate injury: roll threshold for sprain */
export const INJURY_MODERATE_SPRAIN_THRESHOLD = 0.35;

/** Moderate injury: roll threshold for strain */
export const INJURY_MODERATE_STRAIN_THRESHOLD = 0.7;

// ─────────────────────────────────────────
// Post-bout injury constants
// ─────────────────────────────────────────

/** Base bout injury chance for violent kimarite finishes */
export const BOUT_INJURY_VIOLENT_CHANCE = 0.04;

/** Base bout injury chance for normal finishes */
export const BOUT_INJURY_NORMAL_CHANCE = 0.02;

/** Winner injury chance multiplier (fraction of base chance) */
export const WINNER_INJURY_CHANCE_MULTIPLIER = 0.5;
