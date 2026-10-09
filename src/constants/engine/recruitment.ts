/**
 * src/engine/systems/recruitment/RecruitmentConstants.ts
 * =====================================================
 * Authoritative constants for the Scouting & Recruitment System.
 *
 * Defines labels, investment tiers, and cost structures.
 * Goal: Domain-driven design.
 */

import { RANK_NAMES } from "./rankDisplay";

export type { RankLabel } from "./rankDisplay";
export { RANK_NAMES };

/** Scouting Confidence Levels */
export type ConfidenceLevel = "unknown" | "low" | "medium" | "high" | "certain";

/** Scouting Investment Tiers */
export type ScoutingInvestment = "none" | "light" | "standard" | "deep";

/** Attribute Types for Confidence targeting */
export type ScoutingAttributeType = "physical" | "combat" | "style" | "hidden" | "potential";

export const INVESTMENT_BONUS: Record<ScoutingInvestment, number> = {
  none: 0,
  light: 20,
  standard: 40,
  deep: 60,
};

// Talent Pool Constants (merged from TalentPoolConstants.ts)
export const FOREIGN_RIKISHI_LIMIT_PER_HEYA = 1;
/** Canon §5.3 — ~5–10% of foreign-born recruits hold Japanese citizenship. */
export const DUAL_CITIZEN_RECRUIT_SHARE = 0.07;
/** §9.3 — NPCs are reluctant to release foreign-slot rikishi (sunk cost). */
export const FOREIGN_SUNK_COST_RETENTION_MULT = 1.6;
/** Bid-policy multipliers around the foreign slot. */
export const FOREIGN_SLOT_BASE_AGGRESSION = 0.8;
export const FOREIGN_SLOT_AGGRESSION_TRAIT_WEIGHT = 0.006; // per point of risk+ambition over 100 combined
export const FOREIGN_SLOT_BELIEVER_QUIRK_BONUS = 0.35;
export const DUAL_CITIZEN_BID_PREFERENCE = 0.25; // dual citizens are exempt — always attractive
export const BASE_SCOUT_COST = 50000;
export const REVEAL_COST = 100000;
