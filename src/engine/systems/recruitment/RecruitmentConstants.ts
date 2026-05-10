/**
 * src/engine/systems/recruitment/RecruitmentConstants.ts
 * =====================================================
 * Authoritative constants for the Scouting & Recruitment System.
 *
 * Defines labels, investment tiers, and cost structures.
 * Goal: Domain-driven design.
 */

import type { Rank } from "../../types/banzuke";
import type { Style } from "../../types/combat";

/** Human-readable rank labels (JA + EN). */
export interface RankLabel {
  ja: string;
  en: string;
}
export const RANK_NAMES: Record<Rank, RankLabel> = {
  yokozuna: { ja: "横綱", en: "Yokozuna" },
  ozeki: { ja: "大関", en: "Ozeki" },
  sekiwake: { ja: "関脇", en: "Sekiwake" },
  komusubi: { ja: "小結", en: "Komusubi" },
  maegashira: { ja: "前頭", en: "Maegashira" },
  juryo: { ja: "十両", en: "Juryo" },
  makushita: { ja: "幕下", en: "Makushita" },
  sandanme: { ja: "三段目", en: "Sandanme" },
  jonidan: { ja: "序二段", en: "Jonidan" },
  jonokuchi: { ja: "序ノ口", en: "Jonokuchi" },
};

/** High-level style labels - NOW IN archive.json */
export const STYLE_NAMES: Record<Style, object> = {
  oshi: {},
  yotsu: {},
  hybrid: {},
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
