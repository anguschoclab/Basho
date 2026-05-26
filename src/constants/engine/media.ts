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
