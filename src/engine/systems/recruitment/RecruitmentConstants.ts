/**
 * src/engine/systems/recruitment/RecruitmentConstants.ts
 * =====================================================
 * Authoritative constants for the Scouting & Recruitment System.
 *
 * Defines labels, investment tiers, and cost structures.
 * Goal: Domain-driven design.
 */

import type { Rank } from "../../types/banzuke";
import type { Style, TacticalArchetype, CombatArchetype } from "../../types/combat";

/** Human-readable rank labels (JA + EN). */
/** Human-readable rank labels (JA + EN) - NOW IN archive.json */
export const RANK_NAMES: Record<Rank, object> = {
  yokozuna: {},
  ozeki: {},
  sekiwake: {},
  komusubi: {},
  maegashira: {},
  juryo: {},
  makushita: {},
  sandanme: {},
  jonidan: {},
  jonokuchi: {},
};

/** High-level style labels - NOW IN archive.json */
export const STYLE_NAMES: Record<Style, object> = {
  oshi: {},
  yotsu: {},
  hybrid: {},
};

/** Tactical + Combat archetype labels - NOW IN archive.json */
export const ARCHETYPE_NAMES: Record<TacticalArchetype | CombatArchetype, object> = {
  oshi_specialist: {},
  yotsu_specialist: {},
  speedster: {},
  trickster: {},
  all_rounder: {},
  hybrid_oshi_yotsu: {},
  counter_specialist: {},
  oshi: {},
  yotsu: {},
  hybrid: {},
  giant: {},
  tsuppari: {},
  defensive: {},
};

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
