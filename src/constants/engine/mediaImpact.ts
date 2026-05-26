/**
 * Media impact and headline constants.
 */

/** Base media impact value */
export const BASE_MEDIA_IMPACT = 18;

/** Upset bonus to media impact */
export const UPSET_IMPACT_BONUS = 20;

/** Rivalry tension to impact conversion multiplier */
export const RIVALRY_TENSION_IMPACT_MULTIPLIER = 22;

/** Maximum media impact */
export const MAX_MEDIA_IMPACT = 100;

/** Yokozuna tier impact bonus */
export const YOKOZUNA_TIER_IMPACT = 10;

/** Main event impact threshold */
export const MAIN_EVENT_IMPACT_THRESHOLD = 70;

/** National tier impact threshold */
export const NATIONAL_IMPACT_THRESHOLD = 40;

/** Main event tier impact bonus */
export const MAIN_EVENT_TIER_BONUS = 10;

/** National tier impact bonus */
export const NATIONAL_TIER_BONUS = 6;

/** High heat decay rate */
export const HIGH_HEAT_DECAY_RATE = 4;

/** Medium heat decay rate */
export const MEDIUM_HEAT_DECAY_RATE = 3;

/** Low heat decay rate */
export const LOW_HEAT_DECAY_RATE = 2;

/** High heat threshold for decay */
export const HIGH_HEAT_THRESHOLD = 70;

/** Medium heat threshold for decay */
export const MEDIUM_HEAT_THRESHOLD = 40;

/** Maximum heat value */
export const MAX_HEAT = 100;

/** Pressure decay rate */
export const PRESSURE_DECAY_RATE = 3;

/** Maximum pressure value */
export const MAX_PRESSURE = 100;

/** Controversy probability threshold */
export const CONTROVERSY_PROBABILITY_THRESHOLD = 0.3;

/** Rank impact threshold for controversy */
export const CONTROVERSY_RANK_IMPACT_THRESHOLD = 8;

/** Rivalry tension threshold for hype */
export const RIVALRY_TENSION_HYPE_THRESHOLD = 0.1;

/** Hype probability threshold */
export const HYPE_PROBABILITY_THRESHOLD = 0.5;

/** Streak threshold for main event */
export const STREAK_MAIN_EVENT_THRESHOLD = 10;

/** Streak impact per win */
export const STREAK_IMPACT_PER_WIN = 4;

/** Main event severity impact */
export const MAIN_EVENT_SEVERITY_IMPACT = 60;

/** National severity impact */
export const NATIONAL_SEVERITY_IMPACT = 40;

/** Local severity impact */
export const LOCAL_SEVERITY_IMPACT = 20;

/** Maximum headlines count */
export const MAX_HEADLINES_COUNT = 250;

/** Pre-basho headlines count */
export const PRE_BASHO_HEADLINES_COUNT = 50;

/** Headline impact divisor for pressure */
export const HEADLINE_IMPACT_PRESSURE_DIVISOR = 2;

/** Pressure increment per scandal point */
export const PRESSURE_INCREMENT_PER_SCANDAL = 5;

/** Scandal score divisor for pressure bump */
export const SCANDAL_SCORE_PRESSURE_DIVISOR = 10;

/** Reputation impact range */
export const REPUTATION_IMPACT_RANGE = 100;

/** Political capital impact range */
export const POLITICAL_CAPITAL_IMPACT_RANGE = 100;

/** Hot pair heat threshold */
export const HOT_PAIR_HEAT_THRESHOLD = 30;

/** Modest statement impact */
export const MODEST_STATEMENT_IMPACT = { rep: 5, heat: -10 };

/** Bold statement impact */
export const BOLD_STATEMENT_IMPACT = { rep: -10, heat: 25 };

/** Low tier impact bonus */
export const LOW_TIER_BONUS = 3;
