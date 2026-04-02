/**
 * src/engine/systems/recruitment/RecruitmentConstants.ts
 * =====================================================
 * Authoritative constants for the Scouting & Recruitment System.
 * 
 * Defines labels, investment tiers, and cost structures.
 * Goal: Domain-driven design.
 */

import type { Rank } from "../../types/banzuke";
import type { Style, TacticalArchetype } from "../../types/combat";

/** Human-readable rank labels (JA + EN). */
export const RANK_NAMES: Record<Rank, { ja: string; en: string }> = {
  yokozuna: { ja: "横綱", en: "Yokozuna" },
  ozeki: { ja: "大関", en: "Ōzeki" },
  sekiwake: { ja: "関脇", en: "Sekiwake" },
  komusubi: { ja: "小結", en: "Komusubi" },
  maegashira: { ja: "前頭", en: "Maegashira" },
  juryo: { ja: "十両", en: "Jūryō" },
  makushita: { ja: "幕下", en: "Makushita" },
  sandanme: { ja: "三段目", en: "Sandanme" },
  jonidan: { ja: "序二段", en: "Jonidan" },
  jonokuchi: { ja: "序ノ口", en: "Jonokuchi" }
};

/** High-level style labels (JA + EN). */
export const STYLE_NAMES: Record<Style, { label: string; labelJa: string; description: string }> = {
  oshi: {
    label: "Oshi",
    labelJa: "押し",
    description: "Pushing/thrusting sumo—drive forward with hands and pressure rather than securing the belt."
  },
  yotsu: {
    label: "Yotsu",
    labelJa: "四つ",
    description: "Belt-focused sumo—seek a grip, control the hips, and win with throws or force-outs."
  },
  hybrid: {
    label: "Hybrid",
    labelJa: "万能",
    description: "A mixed approach—comfortable switching between pushing and belt fighting depending on the matchup."
  }
};

/** Tactical archetype labels. */
export const ARCHETYPE_NAMES: Record<
  TacticalArchetype,
  { label: string; labelJa: string; description: string }
> = {
  oshi_specialist: { label: "Oshi Specialist", labelJa: "押し型", description: "Relentless forward pressure, strong tachiai." },
  yotsu_specialist: { label: "Yotsu Specialist", labelJa: "四つ型", description: "Belt technician—hunts grips, controls the clinch." },
  speedster: { label: "Speedster", labelJa: "俊敏", description: "Quick feet and angles—wins with movement." },
  trickster: { label: "Trickster", labelJa: "奇策", description: "Unorthodox and volatile—pulls and feints." },
  all_rounder: { label: "All-Rounder", labelJa: "総合", description: "Solid fundamentals everywhere." },
  hybrid_oshi_yotsu: { label: "Hybrid Oshi/Yotsu", labelJa: "押し四つ", description: "Blends pushing and belt fighting." },
  counter_specialist: { label: "Counter Specialist", labelJa: "受け", description: "Reads pressure and punishes mistakes." }
};

/** Scouting Confidence Levels */
export type ConfidenceLevel = "unknown" | "low" | "medium" | "high" | "certain";

/** Scouting Investment Tiers */
export type ScoutingInvestment = "none" | "light" | "standard" | "deep";

/** Attribute Types for Confidence targeting */
export type ScoutingAttributeType = "physical" | "combat" | "style" | "hidden";

export const INVESTMENT_BONUS: Record<ScoutingInvestment, number> = {
  none: 0,
  light: 20,
  standard: 40,
  deep: 60
};
