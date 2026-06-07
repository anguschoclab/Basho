/**
 * Economy and financial constants.
 */

/** Runway band thresholds (in weeks of operating expenses) */
export const RUNWAY_THRESHOLDS = {
  /** Secure runway */
  SECURE: 12,
  /** Comfortable runway */
  COMFORTABLE: 6,
  /** Tight runway */
  TIGHT: 3,
  /** Critical runway */
  CRITICAL: 1,
} as const;

/** Runway band labels */
export const RUNWAY_BANDS = {
  SECURE: "secure",
  COMFORTABLE: "comfortable",
  TIGHT: "tight",
  CRITICAL: "critical",
  DESPERATE: "desperate",
} as const;

// Market constants
export const MARKET_DRIFT_RANGE = 0.06;
export const STOCK_PRICE_ROUNDING = 10000;
export const RNG_MIDPOINT = 0.5;

// Runway months thresholds
export const RUNWAY_MONTHS_STANDARD = 12;
export const RUNWAY_MONTHS_RISK_TAKER = 6;

// Months per year
export const MONTHS_PER_YEAR = 12;

// Staff costs
export const STAFF_HIRE_COST = 500000;
export const STAFF_STRONG_BONUS = 0.15;
export const STAFF_MORALE_HIGH_MULTIPLIER = 1.15;
export const STAFF_MORALE_LOW_MULTIPLIER = 0.6;
export const STAFF_MORALE_HIGH_THRESHOLD = 90;
export const STAFF_MORALE_LOW_THRESHOLD = 30;

// Finance strategy constants
export const AMBITIOUS_TRAIT_THRESHOLD = 40;
export const RISK_TAKER_TRAIT_THRESHOLD = 70;
export const MONTHLY_BURN_PER_RIKISHI = 150000;
export const RUNWAY_MONTHS_RISK_TAKER_STRATEGY = 6;
export const RUNWAY_MONTHS_STANDARD_STRATEGY = 12;
export const MYOSEKI_MAX_FUNDS_RATIO = 0.5;
export const STYLE_ALIGNMENT_SCORE = 50;

// Recruitment strategy constants
export const RECRUITMENT_BASE_RISK_MODIFIER = 0.2;
export const RECRUITMENT_AMBITION_THRESHOLD_RISK = 80;
export const RECRUITMENT_RISK_THRESHOLD_RISK = 70;
export const RECRUITMENT_RISK_TAKER_BONUS = 0.3;
export const RECRUITMENT_BASE_TARGET_SIZE = 10;
export const RECRUITMENT_AMBITION_THRESHOLD_SIZE = 75;
export const RECRUITMENT_AMBITIOUS_SIZE_BONUS = 5;
export const RECRUITMENT_TRADITION_THRESHOLD_SIZE = 70;
export const RECRUITMENT_TRADITIONALIST_SIZE_BONUS = 2;
export const RECRUITMENT_BASE_MULTIPLIER = 1.0;
export const RECRUITMENT_SPITE_PREMIUM_MULTIPLIER = 1.5;
export const RECRUITMENT_MIN_BID = 5000000;

// Staff constants
export const STAFF_BASE_AGE = 25;
export const STAFF_AGE_RANGE = 40;
export const STAFF_APPRENTICE_AGE_THRESHOLD = 30;
export const STAFF_SENIOR_AGE_THRESHOLD = 45;
export const STAFF_DECLINING_AGE_THRESHOLD = 55;
export const STAFF_RETIREMENT_AGE_THRESHOLD = 65;
export const STAFF_SECONDARY_COMPETENCE_CHANCE = 0.5;
export const STAFF_FATIGUE_RANGE = 10;
export const STAFF_BASE_MORALE = 70;
export const STAFF_MORALE_RANGE = 30;
export const STAFF_SCANDAL_EXPOSURE_RANGE = 10;
export const STAFF_SUCCESSOR_AGE_THRESHOLD = 40;
export const STAFF_SUCCESSOR_CHANCE = 0.5;
export const STAFF_CAPACITY_PER_STAFF = 4;
export const STAFF_FATIGUE_GAIN_MULTIPLIER = 2;
export const STAFF_OVERLOAD_THRESHOLD = 1.5;
export const STAFF_OVERLOAD_MORALE_PENALTY = 2;
export const STAFF_NORMAL_MORALE_PENALTY = 1;
export const STAFF_FATIGUE_RECOVERY = 5;
export const STAFF_LOW_FATIGUE_THRESHOLD = 20;
export const STAFF_MORALE_RECOVERY = 1;
export const STAFF_HIGH_MORALE_THRESHOLD = 70;
export const STAFF_MORALE_DECAY = 0.1;
export const STAFF_HIGH_FATIGUE_THRESHOLD = 80;
export const STAFF_MEDIUM_FATIGUE_THRESHOLD = 50;
export const STAFF_HIGH_MORALE_BONUS_THRESHOLD = 90;
export const STAFF_LOW_MORALE_PENALTY_THRESHOLD = 30;
export const STAFF_HIGH_FATIGUE_FACTOR = 0.4;
export const STAFF_MEDIUM_FATIGUE_FACTOR = 0.7;
export const STAFF_SECONDARY_COMPETENCE_MULTIPLIER = 0.4;
export const STAFF_ADMINISTRATOR_DISCOUNT_MULTIPLIER = 0.5;
export const STAFF_ASSISTANT_OYAKATA_BONUS_MULTIPLIER = 0.2;
export const STAFF_MIN_ADMINISTRATION_DISCOUNT = 0.7;

