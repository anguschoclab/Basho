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
