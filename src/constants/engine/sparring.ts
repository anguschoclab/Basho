/**
 * Sparring partnership system constants.
 */

/** Maximum stat points that can bleed from sparring per week */
export const SPARRING_MAX_BLEED = 2;

/** Minimum stat gap between rikishi required for bleed to occur */
export const SPARRING_BLEED_THRESHOLD = 8;

/** Fraction of the stat gap that transfers each week */
export const SPARRING_BLEED_SCALE = 0.05;

/** Chemistry friction multiplier */
export const SPARRING_CHEMISTRY_FRICTION_MULTIPLIER = 1.2;

/** Chemistry rut multiplier */
export const SPARRING_CHEMISTRY_RUT_MULTIPLIER = 0.8;

/** Chemistry neutral multiplier */
export const SPARRING_CHEMISTRY_NEUTRAL_MULTIPLIER = 1.0;
