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

// Rank weight fallback
export const RANK_WEIGHT_FALLBACK = 5;

// Lower division rank weights
export const RANK_WEIGHT_JONIDAN = 5;
export const RANK_WEIGHT_JONOKUCHI = 2;

// Momentum thresholds
export const MOMENTUM_RISING_THRESHOLD = 2;
export const MOMENTUM_DECLINING_THRESHOLD = -2;

// Momentum normalization offset
export const MOMENTUM_NORMALIZATION_OFFSET = 5;

// ── Meta-drift perception bands (canon §§6–8) ────────────────────────────────
// Managers only ever see banded interpretations of completed yearly meta
// assessments — never raw drift factors or kimarite counts.

/** Share of a single tactical family that marks an era as "established". */
export const META_DOMINANCE_ESTABLISHED_SHARE = 0.5;
/** Share that marks a family lead as "emerging". */
export const META_DOMINANCE_EMERGING_SHARE = 0.35;

/** A family whose share grew by this much counts as "ascendant". */
export const META_PRESENCE_ASCENDANT_DELTA = 0.05;
/** A family whose share fell by this much counts as "waning". */
export const META_PRESENCE_WANING_DELTA = 0.05;
/** A family below this share is "absent" from the meta conversation. */
export const META_PRESENCE_ABSENT_SHARE = 0.05;

/** Dominant share change across the history window marking a real trend. */
export const META_TREND_DELTA = 0.05;

/** Fraction of active roster injured/kyujo → "elevated" injury climate. */
export const META_INJURY_ELEVATED_FRACTION = 0.3;
/** Fraction of active roster injured/kyujo → at least "normal". */
export const META_INJURY_NORMAL_FRACTION = 0.1;

// ── Archetype adaptation (canon §8–§11) ──────────────────────────────────────
// Canon §8.1 minimum reaction delays are given in basho; ~9 weeks per basho
// cycle. Repo archetypes map onto the canonical profiles by trait posture.

/** Minimum weeks between first observing a dominant family and committing. */
export const META_LAG_WEEKS: Record<string, number> = {
  gambler: 9, // 1 basho — may act on short-window noise
  scientist: 18, // 2 basho — data-driven but fast
  tyrant: 18, // 2 basho — aggressive embrace
  strategist: 27, // 3 basho
  nurturer: 36, // 4 basho
  strict: 36, // 4 basho
  indulgent: 45, // 5 basho — stagnation failure mode
  traditionalist: 54, // 6 basho — requires long-window confirmation
};

/** Consecutive consistent assessments required before committing (§8.2). */
export const META_CONFIRMATIONS_REQUIRED: Record<string, number> = {
  gambler: 0, // may act on noise
  traditionalist: 2, // long-window confirmation
  strict: 2,
  default: 1,
};

/** Identity rigidity threshold enabling counter-meta posture (canon §11). */
export const META_COUNTER_RIGIDITY_TRADITION = 60;

/** Quirks that enable counter-meta posture independent of traits (§11). */
export const META_COUNTER_QUIRKS = new Set(["Old-School Stickler", "Cold Pragmatist"]);

/** Bid multiplier bonus applied when a candidate matches the family bias. */
export const META_BID_FAMILY_BONUS = 0.3;
