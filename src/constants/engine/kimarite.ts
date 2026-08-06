/**
 * Kimarite Selection Constants
 * =============================
 * Constants governing kimarite (winning technique) selection and success probability.
 */

// Weight multipliers for kimarite categories
export const KIMARITE_NAGE_HINERI_BOOST = 1.3;
export const KIMARITE_KIHON_PENALTY = 0.8;
export const KIMARITE_KIHON_DEFENSE_BOOST = 1.5;
export const KIMARITE_OFF_AXIS_PENALTY = 0.4;

// Tone-tactical family matching boosts
export const KIMARITE_TONE_MATCH_BOOST = 1.15;

// Favorite fighter boost
export const KIMARITE_FAVORITE_BOOST = 1.5;

// Success probability bounds
export const KIMARITE_SUCCESS_MIN = 0.1;
export const KIMARITE_SUCCESS_MAX = 0.97;
export const KIMARITE_SUCCESS_BASE_SCALE = 0.8;

// Division-specific adjustments
export const KIMARITE_MAKUUCHI_BOOST = 0.1;
export const KIMARITE_LOWER_DIVISION_PENALTY = 0.15;

// Favorite fighter success boost
export const KIMARITE_FAVORITE_SUCCESS_BOOST = 0.08;

// Hard minimum success probability
export const KIMARITE_SUCCESS_HARD_MIN = 0.05;

// ─────────────────────────────────────────
// Archetype family bias record
// ─────────────────────────────────────────

/** Archetype-based kimarite family weight biases */
export const ARCHETYPE_FAMILY_BIAS: Record<string, Record<string, number>> = {
  oshi: { push: 1.3, belt: 0.7 },
  yotsu: { belt: 1.3, push: 0.7 },
  tsuppari: { push: 1.4 },
  trickster: { trick: 1.3, push: 0.8 },
  speedster: { speed: 1.3, trick: 1.1 },
  giant: { belt: 1.2, push: 1.1 },
  hybrid: {},
  defensive: { trick: 1.2, push: 0.9 },
};

// ─────────────────────────────────────────
// Grip advantage constants
// ─────────────────────────────────────────

/** Grip advantage threshold for belt technique boost */
export const GRIP_ADVANTAGE_THRESHOLD = 5;

/** Grip advantage weight scaling factor */
export const GRIP_ADVANTAGE_WEIGHT = 0.02;

/** Grip advantage cap */
export const GRIP_ADVANTAGE_CAP = 0.3;

// ─────────────────────────────────────────
// Opponent vulnerability constants
// ─────────────────────────────────────────

/** Low balance threshold for speed technique boost */
export const LOW_BALANCE_THRESHOLD = 40;

/** Low technique threshold for push technique boost */
export const LOW_TECHNIQUE_THRESHOLD = 40;

/** Speed family low balance weight boost */
export const SPEED_LOW_BALANCE_BOOST = 1.2;

/** Push family low technique weight boost */
export const PUSH_LOW_TECH_BOOST = 1.15;

// ─────────────────────────────────────────
// Execution success constants
// ─────────────────────────────────────────

/** Default difficulty when not specified */
export const DEFAULT_DIFFICULTY = 5;

/** Difficulty scaling factor for success probability */
export const DIFFICULTY_SCALE = 10;
