/**
 * File Name: src/engine/narrativeDescriptions.ts
 * Status: REFACTORED / SERVICE-ORIENTED
 *
 * This is now a barrel file that delegates to the centralized NarrativeEngine.
 *
 * Goal: No monoliths, 100% de-duplication.
 */

import { NarrativeService } from "./systems/narrative/NarrativeService";
import { rngFromSeed } from "./rng";

const DUMMY_RNG = rngFromSeed("static-narrative", "system", "desc");

// --- AUTHORITATIVE DELEGATION ---
export * from "./systems/narrative/NarrativeBands";
export * from "./systems/narrative/NarrativeProse";
export * from "./systems/narrative/NarrativeService";

/**
 * Public helper for describing attributes (Backward compatible).
 */
export function describeAttribute(value: number): string {
  const band = NarrativeService.getStatBand(value);
  return NarrativeService.getStatLabel(DUMMY_RNG, band);
}

/**
 * Public helper for describing aggression level (Backward compatible).
 */
export function describeAggression(value: number): string {
  const band = NarrativeService.getStatBand(value);
  return NarrativeService.getStatLabel(DUMMY_RNG, band);
}

/**
 * Public helper for describing experience level (Backward compatible).
 */
export function describeExperience(value: number): string {
  const band = NarrativeService.getStatBand(value);
  return NarrativeService.getStatLabel(DUMMY_RNG, band);
}

/**
 * Public helper for describing fatigue (Backward compatible).
 */
export function describeFatigue(value: number): string {
  const band = NarrativeService.getFatigueBand(value);
  return NarrativeService.getFatigueLabel(DUMMY_RNG, band);
}

/**
 * Describe training effect (Legacy helper).
 */
export function describeTrainingEffect(multiplier: number): string {
  const m = Math.max(0, Math.min(10, multiplier));
  if (m >= 1.5) return "Dramatically increases";
  if (m >= 1.2) return "Significantly improves";
  if (m >= 1.05) return "Slightly enhances";
  if (m >= 0.95) return "Maintains";
  if (m >= 0.8) return "Slightly reduces";
  if (m >= 0.5) return "Significantly reduces";
  return "Dramatically reduces";
}

// Re-export type definitions
export type { AttributeKey } from "./types/rikishi";
