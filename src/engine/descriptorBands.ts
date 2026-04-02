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
