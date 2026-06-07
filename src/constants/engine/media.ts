/**
 * Media and headline constants.
 */

/** Maximum media heat value */
export const MAX_MEDIA_HEAT = 100;

/** Maximum heya pressure value */
export const MAX_HEYA_PRESSURE = 100;

/** Number of media heat history snapshots to keep per rikishi */
export const MEDIA_HEAT_HISTORY_SIZE = 10;

/** Maximum number of headlines to maintain */
export const MAX_HEADLINES = 250;

/** Rank impact values for media coverage */
export const RANK_IMPACTS = {
  YOKOZUNA: 10,
  OZEKI: 8,
  SEKIWAKE: 6,
  KOMUSUBI: 5,
  DEFAULT: 3,
} as const;

/** Streak milestones for headline generation */
export const STREAK_MILESTONES = [5, 8, 10, 12, 15] as const;

/** Tone probability thresholds for high-rank winners */
export const HIGH_RANK_TONE_PROBABILITY = 0.6;

/** Tone probability threshold for default winners */
export const DEFAULT_TONE_PROBABILITY = 0.2;

/** Minimum rank impact for high-rank tone probability */
export const HIGH_RANK_IMPACT_THRESHOLD = 8;

// Streak impact calculations
export const STREAK_IMPACT_BASE = 35;
export const STREAK_IMPACT_MULTIPLIER = 4;
export const STREAK_MAIN_EVENT_THRESHOLD = 10;

// Headline generation chances
export const MAIN_EVENT_HEADLINE_CHANCE = 0.4;
export const STREAK_HEADLINE_THRESHOLD = 10;
export const STREAK_SECONDARY_THRESHOLD = 8;

// Media pre-basho thresholds
export const HOT_PAIR_HEAT_THRESHOLD = 30;
export const CONSECUTIVE_STRONG_OZEKI_THRESHOLD = 1;
export const HEADLINES_HISTORY_MAX = 50;

// Media impact values
export const MEDIA_IMPACT_HIGH = 5;
export const MEDIA_IMPACT_MEDIUM = 3;
export const MEDIA_IMPACT_LOW = 1;

// Media response slice count
export const MEDIA_RESPONSE_SLICE_COUNT = 5;
