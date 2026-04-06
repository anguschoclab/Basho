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

// --- AUTHORITATIVE DELEGATION ---
export * from "./systems/narrative/NarrativeBands";
export * from "./systems/narrative/NarrativeProse";
export * from "./systems/narrative/NarrativeService";

/**
 * Public helper for resolving stats to bands with hysteresis (Backward compatible).
 */
export function toStatBand(value: number, prev?: import("./systems/narrative/NarrativeBands").StatBand): import("./systems/narrative/NarrativeBands").StatBand {
  return NarrativeService.getStatBand(value, prev);
}

/**
 * Public helper for resolving fatigue (Backward compatible).
 */
export function toFatigueBand(value: number, prev?: import("./systems/narrative/NarrativeBands").FatigueBand): import("./systems/narrative/NarrativeBands").FatigueBand {
  return NarrativeService.getFatigueBand(value, prev);
}

/**
 * Public helper for resolving potential (Backward compatible).
 */
export function toPotentialBand(talentSeed: number | undefined, prev?: import("./systems/narrative/NarrativeBands").PotentialBand): import("./systems/narrative/NarrativeBands").PotentialBand {
  return NarrativeService.getPotentialBand(talentSeed, prev);
}

/**
 * Public helper for resolving rivalry heat (Backward compatible).
 */
export function toRivalryHeatBand(value: number, prev?: import("./systems/narrative/NarrativeBands").RivalryHeatBand): import("./systems/narrative/NarrativeBands").RivalryHeatBand {
  return NarrativeService.getRivalryHeatBand(value, prev);
}

/**
 * Public helper for resolving scandal level (Backward compatible).
 */
export function toScandalBand(value: number, prev?: import("./systems/narrative/NarrativeBands").ScandalBand): import("./systems/narrative/NarrativeBands").ScandalBand {
  return NarrativeService.getScandalBand(value, prev);
}

/**
 * Public helper for resolving prize amounts to bands (direct lookup — no 0–100 clamp).
 */
export function toPrizeBand(amount: number): import("./systems/narrative/NarrativeBands").PrizeBand {
  return NarrativeService.getPrizeBand(amount);
}

/**
 * Public helper for resolving trait scores (Backward compatible).
 */
export function toTraitBand(value: number, prev?: import("./systems/narrative/NarrativeBands").TraitBand): import("./systems/narrative/NarrativeBands").TraitBand {
  return NarrativeService.getTraitBand(value, prev);
}

/**
 * Public helper: condition (Iki/Koshi) → Japanese DescriptorBand.
 * Input: 0.0–1.0 float (r.condition).
 */
export function toConditionDescriptor(value: number): import("./systems/narrative/NarrativeBands").DescriptorBand {
  return NarrativeService.getConditionDescriptor(value);
}

/**
 * Public helper: morale (Kiai) → Japanese DescriptorBand.
 * Input: 0.0–1.0 float (r.motivation).
 */
export function toMoraleDescriptor(value: number): import("./systems/narrative/NarrativeBands").DescriptorBand {
  return NarrativeService.getMoraleDescriptor(value);
}

/**
 * Public helper: potential (Soshitsu) → Japanese DescriptorBand.
 * Input: 0–100 integer (r.talentSeed).
 */
export function toPotentialDescriptor(talentSeed: number): import("./systems/narrative/NarrativeBands").DescriptorBand {
  return NarrativeService.getPotentialDescriptor(talentSeed);
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
  archetypeLabel?: { label: string; description: string };
  injuryModifiers?: string[];
}

/**
 * To rikishi descriptor (Legacy support).
 */
export function toRikishiDescriptor(r: any, prev?: any): RikishiDescriptor {
  return {
    powerBand: NarrativeService.getStatBand(r.power, prev?.powerBand),
    speedBand: NarrativeService.getStatBand(r.speed, prev?.speedBand),
    balanceBand: NarrativeService.getStatBand(r.balance, prev?.balanceBand),
    techniqueBand: NarrativeService.getStatBand(r.technique, prev?.techniqueBand),
    conditionBand: "peak", // Simplified legacy field
    fatigueBand: NarrativeService.getFatigueBand(r.fatigue, prev?.fatigueBand),
    momentumBand: NarrativeService.getMomentumBand(r.momentum),
    potentialBand: NarrativeService.getPotentialBand(r.talentSeed, prev?.potentialBand),
    archetypeLabel: undefined, // Simplified legacy field
    injuryModifiers: r.injured ? [getInjuryModifier(r)] : [],
  };
}

function getInjuryModifier(r: any): string {
  const inj = r.currentInjury || r.injuryStatus;
  const severity = inj?.severity;
  if (severity === "serious" || (typeof severity === "number" && severity >= 70)) return "sidelined";
  if (severity === "moderate" || (typeof severity === "number" && severity >= 35)) return "hampered";
  return "taped_up";
}

export type DurationBand = "brief" | "short" | "moderate" | "long" | "extended";

export const DURATION_LABELS: Record<DurationBand, string> = {
  brief:    "A brief moment",
  short:    "A short while",
  moderate: "Some time",
  long:     "A long time",
  extended: "An extended period",
};

export function toDurationBand(days: number): DurationBand {
  if (days <= 1)  return "brief";
  if (days <= 7)  return "short";
  if (days <= 30) return "moderate";
  if (days <= 90) return "long";
  return "extended";
}
