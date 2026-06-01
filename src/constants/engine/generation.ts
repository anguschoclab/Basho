/**
 * World generation constants.
 */

/** Makushita tier count */
export const MAKUSHITA_TIER_COUNT = 150;

/** Jonokuchi tier count */
export const JONOKUCHI_TIER_COUNT = 150;

/** Makushita tier weight */
export const MAKUSHITA_TIER_WEIGHT = 1;

/** Jonokuchi tier weight */
export const JONOKUCHI_TIER_WEIGHT = 0;

/** Sponsor pool base size */
export const SPONSOR_POOL_BASE_SIZE = 180;

/** Sponsor pool size per world size scalar */
export const SPONSOR_POOL_SIZE_PER_SCALAR = 60;

/** Default height mean (cm) */
export const DEFAULT_HEIGHT_MEAN = 180;

/** Height standard deviation (cm) */
export const HEIGHT_STD_DEVIATION = 8;

/** Minimum height (cm) */
export const MIN_HEIGHT = 150;

/** Maximum height (cm) */
export const MAX_HEIGHT = 210;

/** Minimum height for clamp (cm) */
export const MIN_HEIGHT_CLAMP = 160;

/** Maximum height for clamp (cm) */
export const MAX_HEIGHT_CLAMP = 210;

/** Staff name random range */
export const STAFF_NAME_RANDOM_RANGE = 1000;

/** Prodigy PA ceiling fraction */
export const PRODIGY_PA_CEILING_FRACTION = 1.0;

/** Height potential mean multiplier */
export const HEIGHT_POTENTIAL_MEAN_MULTIPLIER = 1.0;

// ─────────────────────────────────────────
// Oyakata + heya seeding (consumed by WorldFactory)
// ─────────────────────────────────────────

/** Base age for a generated oyakata */
export const OYAKATA_BASE_AGE = 45;

/** Random age spread added on top of the base oyakata age */
export const OYAKATA_AGE_RANGE = 20;

/** Base heya reputation before tier scaling */
export const HEYA_REPUTATION_BASE = 80;

/** Reputation reduction per generation tier */
export const HEYA_REPUTATION_TIER_MULTIPLIER = 50;

/** Base heya prestige before tier scaling */
export const HEYA_PRESTIGE_BASE = 50;

/** Prestige reduction per generation tier */
export const HEYA_PRESTIGE_TIER_MULTIPLIER = 30;

/** Starting funds for elite (top-tier) heyas */
export const HEYA_FUNDS_ELITE = 40_000_000;

/** Starting funds for standard heyas */
export const HEYA_FUNDS_STANDARD = 15_000_000;

/** Default welfare risk for a freshly generated heya */
export const HEYA_WELFARE_RISK_DEFAULT = 10;

/** Default starting level for each heya facility (training/recovery/nutrition) */
export const HEYA_FACILITIES_DEFAULT = 50;

/** Default political capital for a freshly generated heya */
export const HEYA_POLITICAL_CAPITAL_DEFAULT = 100;

/** Minimum number of yokozuna seeded at world generation */
export const YOKOZUNA_COUNT_MIN = 0;

/** Maximum number of yokozuna seeded at world generation */
export const YOKOZUNA_COUNT_MAX = 2;
