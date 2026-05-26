/**
 * NPC strategy and AI constants.
 */

/** Risk appetite threshold for conservative strategies */
export const RISK_APPETITE_CONSERVATIVE_THRESHOLD = 0.7;

/** Risk appetite threshold for balanced strategies */
export const RISK_APPETITE_BALANCED_THRESHOLD = 0.5;

/** Risk appetite threshold for fragile ratio check */
export const RISK_APPETITE_FRAGILE_THRESHOLD = 0.4;

/** Risk appetite threshold for safe strategies */
export const RISK_APPETITE_SAFE_THRESHOLD = 0.3;

/** Risk appetite threshold for very safe strategies */
export const RISK_APPETITE_VERY_SAFE_THRESHOLD = 0.1;

/** Welfare discipline threshold for elevated risk */
export const WELFARE_DISCIPLINE_ELEVATED_THRESHOLD = 0.5;

/** Welfare discipline threshold for fragile ratio check */
export const WELFARE_DISCIPLINE_FRAGILE_THRESHOLD = 0.6;

/** Welfare discipline threshold for balanced check */
export const WELFARE_DISCIPLINE_BALANCED_THRESHOLD = 0.7;

/** Fragile ratio threshold for critical strategies */
export const FRAGILE_RATIO_CRITICAL_THRESHOLD = 0.5;

/** Fragile ratio threshold for elevated strategies */
export const FRAGILE_RATIO_ELEVATED_THRESHOLD = 0.4;

/** Fragile ratio threshold for balanced strategies */
export const FRAGILE_RATIO_BALANCED_THRESHOLD = 0.3;

/** Fragile ratio threshold for safe strategies */
export const FRAGILE_RATIO_SAFE_THRESHOLD = 0.1;

/** Ambition trait threshold */
export const TRAIT_AMBITION_THRESHOLD = 50;

/** Risk trait threshold (low) */
export const TRAIT_RISK_LOW_THRESHOLD = 30;

/** Tradition trait threshold */
export const TRAIT_TRADITION_THRESHOLD = 70;

/** Risk trait threshold (high) */
export const TRAIT_RISK_HIGH_THRESHOLD = 60;

/** Compassion trait threshold */
export const TRAIT_COMPASSION_THRESHOLD = 70;

/** Patience trait threshold */
export const TRAIT_PATIENCE_THRESHOLD = 70;

/** Base financial threshold (yen) */
export const BASE_FINANCIAL_THRESHOLD = 600_000_000;

/** High financial threshold (yen) */
export const HIGH_FINANCIAL_THRESHOLD = 700_000_000;

/** Anxious mood threshold multiplier */
export const MOOD_ANXIOUS_MULTIPLIER = 0.8;

/** Obsessed mood threshold multiplier */
export const MOOD_OBSESSED_MULTIPLIER = 1.5;

/** Furious mood threshold multiplier */
export const MOOD_FURIOUS_MULTIPLIER = 1.2;

/** Welfare hawk compassion threshold */
export const WELFARE_HAWK_COMPASSION_THRESHOLD = 75;

/** Traditionalist tradition threshold */
export const TRADITIONALIST_TRADITION_THRESHOLD = 80;

/** Publicity hawk ambition threshold */
export const PUBLICITY_HAWK_AMBITION_THRESHOLD = 80;

/** Default welfare discipline */
export const DEFAULT_WELFARE_DISCIPLINE = 0.4;

/** Default risk appetite */
export const DEFAULT_RISK_APPETITE = 0.5;

/** Compassion divisor for welfare discipline */
export const COMPASSION_WELFARE_DIVISOR = 120;

/** Welfare hawk bonus */
export const WELFARE_HAWK_BONUS = 0.25;

/** Risk divisor for welfare discipline */
export const RISK_WELFARE_DIVISOR = 220;

/** Risk multiplier for risk appetite */
export const RISK_MULTIPLIER = 0.65;

/** Ambition multiplier for risk appetite */
export const AMBITION_MULTIPLIER = 0.35;
