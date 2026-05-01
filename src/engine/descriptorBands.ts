// @ts-nocheck
/**
 * File Name: src/engine/descriptorBands.ts
 * Status: REFACTORED / SERVICE-ORIENTED
 *
 * This is now a barrel file that delegates to the centralized NarrativeEngine.
 *
 * Goal: No monoliths, 100% de-duplication.
 */

import { NarrativeService } from "./systems/narrative/NarrativeService";
import { RikishiArchetype } from "./types/combat";
import { SeededRNG } from "./rng";

// --- AUTHORITATIVE DELEGATION ---
export * from "./systems/narrative/NarrativeBands";
export * from "./systems/narrative/NarrativeProse";
export * from "./systems/narrative/NarrativeService";

/**
 * Public helper for resolving stats to bands with hysteresis (Backward compatible).
 */
export function toStatBand(
  value: number,
  prev?: import("./systems/narrative/NarrativeBands").StatBand
): import("./systems/narrative/NarrativeBands").StatBand {
  return NarrativeService.getStatBand(value, prev);
}

/**
 * Public helper for resolving fatigue (Backward compatible).
 */
export function toFatigueBand(
  value: number,
  prev?: import("./systems/narrative/NarrativeBands").FatigueBand
): import("./systems/narrative/NarrativeBands").FatigueBand {
  return NarrativeService.getFatigueBand(value, prev);
}

/**
 * Public helper for resolving potential (Backward compatible).
 */
export function toPotentialBand(
  talentSeed: number | undefined,
  prev?: import("./systems/narrative/NarrativeBands").PotentialBand
): import("./systems/narrative/NarrativeBands").PotentialBand {
  return NarrativeService.getPotentialBand(talentSeed, prev);
}

/**
 * Public helper for resolving rivalry heat (Backward compatible).
 */
export function toRivalryHeatBand(
  value: number,
  prev?: import("./systems/narrative/NarrativeBands").RivalryHeatBand
): import("./systems/narrative/NarrativeBands").RivalryHeatBand {
  return NarrativeService.getRivalryHeatBand(value, prev);
}

/**
 * Public helper for resolving scandal level (Backward compatible).
 */
export function toScandalBand(
  value: number,
  prev?: import("./systems/narrative/NarrativeBands").ScandalBand
): import("./systems/narrative/NarrativeBands").ScandalBand {
  return NarrativeService.getScandalBand(value, prev);
}

/**
 * Public helper for resolving prize amounts to bands (direct lookup — no 0–100 clamp).
 */
export function toPrizeBand(
  amount: number
): import("./systems/narrative/NarrativeBands").PrizeBand {
  return NarrativeService.getPrizeBand(amount);
}

/**
 * Public helper for resolving trait scores (Backward compatible).
 */
export function toTraitBand(
  value: number,
  prev?: import("./systems/narrative/NarrativeBands").TraitBand
): import("./systems/narrative/NarrativeBands").TraitBand {
  return NarrativeService.getTraitBand(value, prev);
}

/**
 * Public helper for resolving age (Backward compatible).
 */
export function toAgeBand(
  value: number,
  prev?: import("./systems/narrative/NarrativeBands").AgeBand
): import("./systems/narrative/NarrativeBands").AgeBand {
  return NarrativeService.getAgeBand(value, prev);
}

/**
 * Public helper for resolving experience (Backward compatible).
 */
export function toExperienceBand(
  value: number,
  prev?: import("./systems/narrative/NarrativeBands").ExperienceBand
): import("./systems/narrative/NarrativeBands").ExperienceBand {
  return NarrativeService.getExperienceBand(value, prev);
}

/**
 * Public helper for resolving weight (Backward compatible).
 */
export function toWeightBand(
  kg: number,
  prev?: import("./systems/narrative/NarrativeBands").WeightBand
): import("./systems/narrative/NarrativeBands").WeightBand {
  return NarrativeService.getWeightBand(kg, prev);
}

/**
 * Public helper for resolving height (Backward compatible).
 */
export function toHeightBand(
  cm: number,
  prev?: import("./systems/narrative/NarrativeBands").HeightBand
): import("./systems/narrative/NarrativeBands").HeightBand {
  return NarrativeService.getHeightBand(cm, prev);
}

/**
 * Public helper for resolving reputation (Backward compatible).
 */
export function toReputationBand(
  value: number,
  prev?: import("./systems/narrative/NarrativeBands").ReputationBand
): import("./systems/narrative/NarrativeBands").ReputationBand {
  return NarrativeService.getReputationBand(value, prev);
}

/**
 * Public helper for resolving injury severity (Backward compatible).
 */
export function toInjurySeverityBand(
  value: number,
  prev?: import("./systems/narrative/NarrativeBands").InjurySeverityBand
): import("./systems/narrative/NarrativeBands").InjurySeverityBand {
  return NarrativeService.getInjurySeverityBand(value, prev);
}

/**
 * Public helper for resolving win rate (Backward compatible).
 */
export function toWinRateBand(
  rate: number,
  prev?: import("./systems/narrative/NarrativeBands").WinRateBand
): import("./systems/narrative/NarrativeBands").WinRateBand {
  return NarrativeService.getWinRateBand(rate, prev);
}

/**
 * Public helper: condition (Iki/Koshi) → Japanese DescriptorBand.
 */
export function toConditionDescriptor(
  rng: SeededRNG,
  value: number
): import("./systems/narrative/NarrativeBands").DescriptorBand {
  return NarrativeService.getConditionDescriptor(rng, value);
}

/**
 * Public helper: morale (Kiai) → Japanese DescriptorBand.
 */
export function toMoraleDescriptor(
  rng: SeededRNG,
  value: number
): import("./systems/narrative/NarrativeBands").DescriptorBand {
  return NarrativeService.getMoraleDescriptor(rng, value);
}

/**
 * Public helper: potential (Soshitsu) → Japanese DescriptorBand.
 */
export function toPotentialDescriptor(
  rng: SeededRNG,
  talentSeed: number
): import("./systems/narrative/NarrativeBands").DescriptorBand {
  return NarrativeService.getPotentialDescriptor(rng, talentSeed);
}

/**
 * Unified Rikishi Descriptor (Legacy support).
 */
export interface RikishiDescriptor {
  powerBand: import("./systems/narrative/NarrativeBands").StatBand;
  speedBand: import("./systems/narrative/NarrativeBands").StatBand;
  balanceBand: import("./systems/narrative/NarrativeBands").StatBand;
  techniqueBand: import("./systems/narrative/NarrativeBands").StatBand;
  conditionBand: string; // Legacy
  fatigueBand: import("./systems/narrative/NarrativeBands").FatigueBand;
  momentumBand: import("./systems/narrative/NarrativeBands").MomentumBand;
  potentialBand?: import("./systems/narrative/NarrativeBands").PotentialBand;
  ageBand?: import("./systems/narrative/NarrativeBands").AgeBand;
  experienceBand?: import("./systems/narrative/NarrativeBands").ExperienceBand;
  weightBand?: import("./systems/narrative/NarrativeBands").WeightBand;
  heightBand?: import("./systems/narrative/NarrativeBands").HeightBand;
  archetypeLabel?: { label: string; description: string };
  injuryModifiers?: string[];
}

/**
 * To rikishi descriptor (Legacy support).
 */
export function toRikishiDescriptor(rng: SeededRNG, r: any, prev?: any): RikishiDescriptor {
  return {
    powerBand: NarrativeService.getStatBand(r.power, prev?.powerBand),
    speedBand: NarrativeService.getStatBand(r.speed, prev?.speedBand),
    balanceBand: NarrativeService.getStatBand(r.balance, prev?.balanceBand),
    techniqueBand: NarrativeService.getStatBand(r.technique, prev?.techniqueBand),
    conditionBand: "peak", // Simplified legacy field
    fatigueBand: NarrativeService.getFatigueBand(r.fatigue, prev?.fatigueBand),
    momentumBand: NarrativeService.getMomentumBand(r.momentum),
    potentialBand: NarrativeService.getPotentialBand(r.talentSeed, prev?.potentialBand),
    ageBand: NarrativeService.getAgeBand(r.age ?? 25, prev?.ageBand),
    experienceBand: NarrativeService.getExperienceBand(r.experience ?? 0, prev?.experienceBand),
    weightBand: NarrativeService.getWeightBand(r.weight ?? 150, prev?.weightBand),
    archetypeLabel: undefined, // Simplified legacy field
    injuryModifiers: r.injured ? [getInjuryModifier(r)] : [],
  };
}

function getInjuryModifier(r: any): string {
  const inj = r.currentInjury || r.injuryStatus;
  const severity = inj?.severity;
  if (severity === "serious" || (typeof severity === "number" && severity >= 80))
    return "sidelined";
  if (severity === "moderate" || (typeof severity === "number" && severity >= 60))
    return "hampered";
  if (typeof severity === "number" && severity >= 40) return "favoring_it";
  if (typeof severity === "number" && severity >= 20) return "moving_gingerly";
  return "taped_up";
}

export type DurationBand = "brief" | "short" | "moderate" | "long" | "extended";

/** @deprecated Move to BardEngine.resolve for new narrative strings */
export const DURATION_LABELS: Record<DurationBand, string> = {
  brief: "A brief moment",
  short: "A short while",
  moderate: "Some time",
  long: "A long time",
  extended: "An extended period",
};

export function toDurationBand(days: number): DurationBand {
  if (days <= 1) return "brief";
  if (days <= 7) return "short";
  if (days <= 30) return "moderate";
  if (days <= 90) return "long";
  return "extended";
}
