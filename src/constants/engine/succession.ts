/**
 * succession.ts — WS5 institutional constants (canon §16).
 */

/** Non-age NPC succession triggers. */
export const SUCCESSION_INSOLVENCY_EVENTS = 3;
export const SUCCESSION_MAJOR_SCANDALS = 2;
export const SUCCESSION_UNDERPERFORMANCE_BASHO = 8;

/** A heya underperforms a basho when no sekitori entrant reaches kachi-koshi. */
export const SEKITORI_KACHI_KOSHI_WINS = 8;
/** Minimum bout volume before a bad record counts (tiny samples are noise). */
export const UNDERPERFORMANCE_MIN_BOUTS = 5;

/** The predecessor's plan-family bias persists this many basho. */
export const LEGACY_MODIFIER_DURATION_BASHO = 3;
/** Bounded plan-score bonuses — tilt borderline choices, never rescue a 0. */
export const LEGACY_PLAN_BONUS = 6;
export const FACTION_PLAN_ALIGNMENT_BONUS = 6;
export const GRUDGE_PLAN_BONUS = 4;
