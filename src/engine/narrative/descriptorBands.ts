/**
 * File Name: src/engine/narrative/descriptorBands.ts
 * Status: REFACTORED / SERVICE-ORIENTED
 *
 * This is now a barrel file that delegates to the centralized NarrativeEngine.
 *
 * Goal: No monoliths, 100% de-duplication.
 */

import { NarrativeService } from "@/engine/narrative/NarrativeService";
import { SeededRNG } from "@/engine/core/rng";
import type { Rikishi } from "@/engine/types/rikishi";

// --- AUTHORITATIVE DELEGATION ---
export * from "@/engine/narrative/NarrativeBands";
export * from "@/engine/narrative/NarrativeProse";
export * from "@/engine/narrative/NarrativeService";

/**
 * Public helper for resolving stats to bands with hysteresis (Backward compatible).
 */
export function toStatBand(
  value: number,
  prev?: import("./NarrativeBands").StatBand
): import("./NarrativeBands").StatBand {
  return NarrativeService.getStatBand(value, prev);
}

/**
 * Public helper for resolving fatigue (Backward compatible).
 */
export function toFatigueBand(
  value: number,
  prev?: import("./NarrativeBands").FatigueBand
): import("./NarrativeBands").FatigueBand {
  return NarrativeService.getFatigueBand(value, prev);
}

/**
 * Public helper for resolving potential (Backward compatible).
 */
export function toPotentialBand(
  talentSeed: number | undefined,
  prev?: import("./NarrativeBands").PotentialBand
): import("./NarrativeBands").PotentialBand {
  return NarrativeService.getPotentialBand(talentSeed, prev);
}

/**
 * Public helper for resolving rivalry heat (Backward compatible).
 */
export function toRivalryHeatBand(
  value: number,
  prev?: import("./NarrativeBands").RivalryHeatBand
): import("./NarrativeBands").RivalryHeatBand {
  return NarrativeService.getRivalryHeatBand(value, prev);
}

/**
 * Public helper for resolving scandal level (Backward compatible).
 */
export function toScandalBand(
  value: number,
  prev?: import("./NarrativeBands").ScandalBand
): import("./NarrativeBands").ScandalBand {
  return NarrativeService.getScandalBand(value, prev);
}

/**
 * Public helper for resolving prize amounts to bands (direct lookup — no 0–100 clamp).
 */
export function toPrizeBand(
  amount: number
): import("./NarrativeBands").PrizeBand {
  return NarrativeService.getPrizeBand(amount);
}

/**
 * Public helper for resolving trait scores (Backward compatible).
 */
export function toTraitBand(
  value: number,
  prev?: import("./NarrativeBands").TraitBand
): import("./NarrativeBands").TraitBand {
  return NarrativeService.getTraitBand(value, prev);
}

/**
 * Public helper for resolving age (Backward compatible).
 */
export function toAgeBand(
  value: number,
  prev?: import("./NarrativeBands").AgeBand
): import("./NarrativeBands").AgeBand {
  return NarrativeService.getAgeBand(value, prev);
}

/**
 * Public helper for resolving experience (Backward compatible).
 */
export function toExperienceBand(
  value: number,
  prev?: import("./NarrativeBands").ExperienceBand
): import("./NarrativeBands").ExperienceBand {
  return NarrativeService.getExperienceBand(value, prev);
}

/**
 * Public helper for resolving weight (Backward compatible).
 */
export function toWeightBand(
  kg: number,
  prev?: import("./NarrativeBands").WeightBand
): import("./NarrativeBands").WeightBand {
  return NarrativeService.getWeightBand(kg, prev);
}

/**
 * Public helper for resolving height (Backward compatible).
 */
export function toHeightBand(
  cm: number,
  prev?: import("./NarrativeBands").HeightBand
): import("./NarrativeBands").HeightBand {
  return NarrativeService.getHeightBand(cm, prev);
}

/**
 * Public helper for resolving reputation (Backward compatible).
 */
export function toReputationBand(
  value: number,
  prev?: import("./NarrativeBands").ReputationBand
): import("./NarrativeBands").ReputationBand {
  return NarrativeService.getReputationBand(value, prev);
}

/**
 * Public helper for resolving injury severity (Backward compatible).
 */
export function toInjurySeverityBand(
  value: number,
  prev?: import("./NarrativeBands").InjurySeverityBand
): import("./NarrativeBands").InjurySeverityBand {
  return NarrativeService.getInjurySeverityBand(value, prev);
}

/**
 * Public helper for resolving win rate (Backward compatible).
 */
export function toWinRateBand(
  rate: number,
  prev?: import("./NarrativeBands").WinRateBand
): import("./NarrativeBands").WinRateBand {
  return NarrativeService.getWinRateBand(rate, prev);
}

/**
 * Public helper: condition (Iki/Koshi) → Japanese DescriptorBand.
 */
export function toConditionDescriptor(
  rng: SeededRNG,
  value: number
): import("./NarrativeBands").DescriptorBand {
  return NarrativeService.getConditionDescriptor(rng, value);
}

/**
 * Public helper: morale (Kiai) → Japanese DescriptorBand.
 */
export function toMoraleDescriptor(
  rng: SeededRNG,
  value: number
): import("./NarrativeBands").DescriptorBand {
  return NarrativeService.getMoraleDescriptor(rng, value);
}

/**
 * Public helper: potential (Soshitsu) → Japanese DescriptorBand.
 */
export function toPotentialDescriptor(
  rng: SeededRNG,
  talentSeed: number
): import("./NarrativeBands").DescriptorBand {
  return NarrativeService.getPotentialDescriptor(rng, talentSeed);
}

/**
 * Unified Rikishi Descriptor (Legacy support).
 */
export interface RikishiDescriptor {
  powerBand: import("./NarrativeBands").StatBand;
  speedBand: import("./NarrativeBands").StatBand;
  balanceBand: import("./NarrativeBands").StatBand;
  techniqueBand: import("./NarrativeBands").StatBand;
  conditionBand: string; // Legacy
  fatigueBand: import("./NarrativeBands").FatigueBand;
  momentumBand: import("./NarrativeBands").MomentumBand;
  potentialBand?: import("./NarrativeBands").PotentialBand;
  ageBand?: import("./NarrativeBands").AgeBand;
  experienceBand?: import("./NarrativeBands").ExperienceBand;
  weightBand?: import("./NarrativeBands").WeightBand;
  heightBand?: import("./NarrativeBands").HeightBand;
  archetypeLabel?: { label: string; description: string };
  injuryModifiers?: string[];
}

/**
 * To rikishi descriptor (Legacy support).
 */
export function toRikishiDescriptor(
  _rng: SeededRNG,
  r: Rikishi,
  prev?: RikishiDescriptor
): RikishiDescriptor {
  return {
    powerBand: NarrativeService.getStatBand(r.stats.power, prev?.powerBand),
    speedBand: NarrativeService.getStatBand(r.stats.speed, prev?.speedBand),
    balanceBand: NarrativeService.getStatBand(r.stats.balance, prev?.balanceBand),
    techniqueBand: NarrativeService.getStatBand(r.stats.technique, prev?.techniqueBand),
    conditionBand: "peak", // Simplified legacy field
    fatigueBand: NarrativeService.getFatigueBand(r.fatigue, prev?.fatigueBand),
    momentumBand: NarrativeService.getMomentumBand(r.momentum),
    potentialBand: NarrativeService.getPotentialBand(r.talentSeed, prev?.potentialBand),
    ageBand: NarrativeService.getAgeBand(r.age ?? 25, prev?.ageBand),
    experienceBand: NarrativeService.getExperienceBand(
      r.stats.experience ?? 0,
      prev?.experienceBand
    ),
    weightBand: NarrativeService.getWeightBand(r.weight ?? 150, prev?.weightBand),
    heightBand: NarrativeService.getHeightBand(r.height ?? 180, prev?.heightBand),
    archetypeLabel: undefined, // Simplified legacy field
    injuryModifiers: r.injured ? [getInjuryModifier(r)] : [],
  };
}

function getInjuryModifier(r: Rikishi): string {
  const inj = r.injuryStatus;
  const severity = inj?.severity;
  if (severity === "serious") return "sidelined";
  if (severity === "moderate") return "hampered";
  return "taped_up";
}

export type DurationBand = "brief" | "short" | "moderate" | "long" | "extended";

export function toDurationBand(days: number): DurationBand {
  if (days <= 1) return "brief";
  if (days <= 7) return "short";
  if (days <= 30) return "moderate";
  if (days <= 90) return "long";
  return "extended";
}
