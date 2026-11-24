/**
 * src/constants/engine/recruitment.ts
 * =====================================================
 * Authoritative constants for the Scouting & Recruitment System.
 *
 * Defines labels, investment tiers, and cost structures.
 * Goal: Domain-driven design.
 */

import { RANK_NAMES } from "@/constants/engine/rankDisplay";

export type { RankLabel } from "@/constants/engine/rankDisplay";
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
/**
 * JSA new-apprentice eligibility: a standard recruit must be under 23 at the
 * shindeshi kensa (debut exam). The under-25 exception applies only to
 * qualified amateur backgrounds — handled by the tsukedashi path, not here.
 */
export const NEW_APPRENTICE_MAX_AGE = 23;

/**
 * Tsukedashi (付け出し): elite amateur credential holders may debut on the
 * banzuke instead of running maezumo, and the amateur-experience exception
 * raises the debut age gate from <23 to <25. Placement follows the classic
 * scheme — makushita tsukedashi at Ms60, sandanme tsukedashi at Sd80.
 */
export const TSUKEDASHI_MAX_AGE = 25;
export const MAKUSHITA_TSUKEDASHI_RANK = 60;
export const SANDANME_TSUKEDASHI_RANK = 80;
/** Share of amateur-star candidates who hold national-title credentials. */
export const TSUKEDASHI_UNIVERSITY_SHARE = 0.4;
export const TSUKEDASHI_HS_SHARE = 0.25;
/** Canon §5.3 — ~5–10% of foreign-born recruits hold Japanese citizenship. */
export const DUAL_CITIZEN_RECRUIT_SHARE = 0.07;
/** §9.3 — NPCs are reluctant to release foreign-slot rikishi (sunk cost). */
export const FOREIGN_SUNK_COST_RETENTION_MULT = 1.6;
/** Bid-policy multipliers around the foreign slot. */
// §5.x — base parity: an eligible open-slot heya bids on a foreigner as it
// would on an equal domestic. 0.8 systematically lost vacancy budgets to
// domestics, collapsing steady-state foreign occupancy (measured +0 intake
// for 4+ consecutive years once all genesis slots filled).
export const FOREIGN_SLOT_BASE_AGGRESSION = 1.0;
export const FOREIGN_SLOT_AGGRESSION_TRAIT_WEIGHT = 0.006; // per point of risk+ambition over 100 combined
export const FOREIGN_SLOT_BELIEVER_QUIRK_BONUS = 0.35;
/** Established channel bonus: a heya that has fielded a foreigner before
 *  has the relationship pipeline to re-sign one (real-world amateur-network
 *  durability). Multiplies the aggression score for open-slot pursuit. */
export const FOREIGN_PIPELINE_BONUS_MULT = 1.25;
export const DUAL_CITIZEN_BID_PREFERENCE = 0.25; // dual citizens are exempt — always attractive
export const BASE_SCOUT_COST = 50000;
export const REVEAL_COST = 100000;

// ── JSA realism: foreign-rikishi demographics (Sept 2026 census) ───────────
//
// Real-world calibration targets:
//   ~69% of active heyas carry exactly one foreign-born slot-consumer.
//   Foreign rikishi are ~23% of sekitori but only ~3% of the lower
//   divisions — a hard selection funnel: they debut older (18–22), arrive
//   with proven ability (PA floor + faster development), and ~74% are
//   Mongolian. Ukraine is the #2 pipeline; RU/KZ/CN/US/PH/UK form the tail;
//   legacy pipelines (Georgia, Brazil) are mostly dormant.

/** Weighted country-of-origin table for every foreign-rikishi roll. */
export const FOREIGN_ORIGIN_TABLE: ReadonlyArray<readonly [string, number]> = [
  ["Mongolia", 0.74],
  ["Ukraine", 0.06],
  ["Russia", 0.04],
  ["Kazakhstan", 0.04],
  ["China", 0.03],
  ["USA", 0.03],
  ["Philippines", 0.02],
  ["United Kingdom", 0.02],
  // Legacy pipelines — a trace presence, not a live share.
  ["Georgia", 0.01],
  ["Brazil", 0.01],
];

/** Genesis: share of active heyas seeded with one foreign-slot rikishi. */
export const GENESIS_FOREIGN_HEYA_OCCUPANCY = 0.68;

/**
 * Genesis: division composition for the seeded foreigner — sekitori-skewed
 * (16/70 sekitori ≈ 23% vs 15/523 lower ≈ 3% in the real census).
 */
export const GENESIS_FOREIGN_DIVISION_TABLE: ReadonlyArray<
  readonly ["makuuchi" | "juryo" | "makushita" | "sandanme" | "jonidan" | "jonokuchi", number]
> = [
  ["makuuchi", 0.28],
  ["juryo", 0.22],
  ["makushita", 0.22],
  ["sandanme", 0.15],
  ["jonidan", 0.1],
  ["jonokuchi", 0.03],
];

/** Pipeline: per-division chance a generated rikishi is foreign (selection funnel). */
export const FOREIGN_RECRUIT_CHANCE_BY_DIVISION: Record<string, number> = {
  makuuchi: 0.24,
  juryo: 0.21,
  makushita: 0.05,
  sandanme: 0.02,
  jonidan: 0.01,
  jonokuchi: 0.005,
};

/** Foreign recruits debut older and arrive with proven ability. */
export const FOREIGN_DEBUT_AGE_MIN = 18;
export const FOREIGN_DEBUT_AGE_MAX = 22;
// The selection funnel is harsher than domestic intake — survivors are
// proven amateurs, not average juryo prospects. Measured: a 58 floor
// produces makushita-ceiling careers and zero organic sekitori over
// 16 sim-years (real ~23% of sekitori are foreign). Floored at
// maegashira-mean potential so a non-trivial share converts upward.
export const FOREIGN_PA_FLOOR = 64;
export const FOREIGN_DEVSPEED_MULT = 1.4;

/** Rare foreign sandanme-tsukedashi (the Kinbozan path); MsTD is never foreign. */
export const FOREIGN_SDTD_CHANCE = 0.04;

/** WS-2 — a tsukedashi credential expires one year after it is earned. */
export const TSUKEDASHI_EXPIRY_YEARS = 1;

/** WS-2 — TD holders are proven amateurs: quality floor, not a label. */
export const TSUKEDASHI_PA_FLOOR = 62;
export const TSUKEDASHI_DEVSPEED_MIN = 1.4;

/** WS-3a — oyakata quirks that hard-close the foreign pipeline entirely. */
export const FOREIGN_BID_BLOCKING_QUIRKS: readonly string[] = [
  "Domestic-Only Traditionalist",
  "Regional Loyalist",
];

/** WS-3c — late-tenure taper: masters near retirement open no new pipelines. */
export const FOREIGN_BID_TAPER_START_AGE = 63;
export const FOREIGN_BID_TAPER_END_AGE = 65;

/** WS-3b — foreign-slot consumers stalled this long below makushita retire. */
export const FOREIGN_STALL_DIVISIONS: ReadonlySet<string> = new Set([
  "sandanme",
  "jonidan",
  "jonokuchi",
]);
export const FOREIGN_STALL_BASHO = 6;

/** WS-4 — veterans in the unsalaried divisions often intai rather than
 *  relocate when their stable is absorbed (merger-attrition rule). */
export const MERGER_TRANSFER_RETIRE_AGE = 30;
export const MERGER_RETIRE_DIVISIONS: ReadonlySet<string> = new Set([
  "makushita",
  "sandanme",
  "jonidan",
  "jonokuchi",
]);
