/**
 * Perception Constants
 * ===================
 * Constants governing NPC perception bands and thresholds for rikishi evaluation.
 */

// Condition thresholds
export const CONDITION_PEAK_THRESHOLD = 90;
export const CONDITION_GOOD_THRESHOLD = 70;
export const CONDITION_FAIR_THRESHOLD = 50;
export const CONDITION_WORN_THRESHOLD = 30;

// Risk thresholds
export const RISK_SAFE_THRESHOLD = 20;
export const RISK_CAUTIOUS_THRESHOLD = 44;
export const RISK_ELEVATED_THRESHOLD = 69;

// Scandal thresholds
export const SCANDAL_MODERATE_THRESHOLD = 60;
export const SCANDAL_MILD_THRESHOLD = 30;

// Heat thresholds
export const HEAT_BLAZING_THRESHOLD = 75;
export const HEAT_HOT_THRESHOLD = 50;
export const HEAT_WARM_THRESHOLD = 25;

// Strength thresholds (individual)
export const STRENGTH_DOMINANT_THRESHOLD = 85;
export const STRENGTH_OZEKI_THRESHOLD = 70;
export const STRENGTH_SEKIWAKE_THRESHOLD = 60;
export const STRENGTH_MAEGASHIRA_THRESHOLD = 40;
export const STRENGTH_JURYO_THRESHOLD = 25;
export const STRENGTH_MAKUSHITA_THRESHOLD = 15;
export const STRENGTH_SANDANME_THRESHOLD = 10;

// Average strength thresholds
export const AVG_STRENGTH_DOMINANT_THRESHOLD = 60;
export const AVG_STRENGTH_STRONG_THRESHOLD = 40;
export const AVG_STRENGTH_COMPETITIVE_THRESHOLD = 25;
export const AVG_STRENGTH_DEVELOPING_THRESHOLD = 12;

// Morale calculation
export const MORALE_SCORE_WEIGHT = 0.6;
export const MOMENTUM_NORMALIZER = 4;

// Morale thresholds
export const MORALE_INSPIRED_THRESHOLD = 85;
export const MORALE_CONTENT_THRESHOLD = 65;
export const MORALE_NEUTRAL_THRESHOLD = 45;
export const MORALE_DISGRUNTLED_THRESHOLD = 25;
