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

/** Greedy risk threshold (very low) */
export const TRAIT_GREEDY_RISK_THRESHOLD = 20;

/** Vindictive ambition threshold */
export const TRAIT_VINDICTIVE_AMBITION_THRESHOLD = 80;

/** Vindictive risk threshold */
export const TRAIT_VINDICTIVE_RISK_THRESHOLD = 70;

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

// Threshold boost multipliers
export const THRESHOLD_BOOST_HIGH = 1.5;
export const THRESHOLD_BOOST_MODERATE = 0.8;
export const THRESHOLD_BOOST_LOW = 0.7;

// Default trait values
export const DEFAULT_TRAIT_VALUE = 50;
export const TRAIT_MULTIPLIER_DIVISOR = 50;

// Adjust score defaults
export const ADJUST_SCORE_DEFAULT_MIN = 0;
export const ADJUST_SCORE_DEFAULT_MAX = 100;

// Basho final day
export const BASHO_FINAL_DAY = 15;

// Kachikoshi/Makekoshi precipice
export const KOSHI_PRECIPICE_LOSSES = 7;
export const KACHIKOSHI_PRECIPICE_WINS = 7;

// Roster thresholds
export const ROSTER_SIZE_WEAK_THRESHOLD = 8;

// Risk appetite high thresholds
export const RISK_APPETITE_HIGH_THRESHOLD = 0.85;
export const RISK_APPETITE_MODERATE_THRESHOLD = 0.7;

// Oyakata personality chances
export const LEGENDARY_YOKOZUNA_CHANCE = 0.75;
export const LEGENDARY_SANYAKU_CHANCE = 0.95;
export const POWERFUL_OZEKI_CHANCE = 0.55;
export const POWERFUL_SANYAKU_CHANCE = 0.85;

// Discipline hawk thresholds
export const DISCIPLINE_HAWK_TRADITION_THRESHOLD = 80;

// Max years in charge
export const MAX_YEARS_IN_CHARGE = 20;

// Trait variance
export const TRAIT_VARIANCE_RANGE = 20;
export const TRAIT_VARIANCE_HALF_RANGE = 10;
export const TRAIT_BLEND_VARIANCE_RANGE = 10;
export const TRAIT_BLEND_VARIANCE_HALF_RANGE = 5;

// Rank generation thresholds (legendary heya)
export const LEGENDARY_YOKOZUNA_THRESHOLD = 0.4;
export const LEGENDARY_OZEKI_THRESHOLD = 0.75;
export const LEGENDARY_SANYAKU_THRESHOLD = 0.95;

// Rank generation thresholds (powerful heya)
export const POWERFUL_YOKOZUNA_THRESHOLD = 0.2;
export const POWERFUL_OZEKI_THRESHOLD = 0.55;
export const POWERFUL_SANYAKU_THRESHOLD = 0.85;

// Rank generation thresholds (established heya)
export const ESTABLISHED_YOKOZUNA_THRESHOLD = 0.05;
export const ESTABLISHED_OZEKI_THRESHOLD = 0.2;
export const ESTABLISHED_SANYAKU_THRESHOLD = 0.6;
export const ESTABLISHED_MAEGASHIRA_THRESHOLD = 0.9;

// Quirk count
export const QUIRK_COUNT_HIGH = 3;
export const QUIRK_COUNT_BASE = 2;

// Tick constants
export const WEEKLY_TICK_THRESHOLD = 7;
export const MAX_DAYS_ADVANCE = 365;
export const POST_BASHO_DAYS = 7;
export const INTERIM_DAYS = 42;

// NPC weekly decision constants
export const TOP_RIKISHI_COUNT = 5;
export const MAX_ROSTER_SIZE = 15;
export const RISK_CONDITION_WEIGHT = 0.6;
export const RISK_FATIGUE_WEIGHT = 0.4;
export const HIGH_RISK_THRESHOLD = 60;
export const HIGH_RISK_RATIO_THRESHOLD = 0.4;

// Oyakata personality constants
export const SAN_YAKU_BOOL_CHANCE = 0.5;
export const ADAPTABILITY_TRADITION_INVERSE = 100;
export const DEFAULT_HEYA_TIER = 0.5;
