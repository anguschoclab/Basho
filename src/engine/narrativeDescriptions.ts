/**
 * File Name: src/engine/bardDescriptions.ts
 * Status: REFACTORED / SERVICE-ORIENTED
 *
 * This is now a barrel file that delegates to the centralized NarrativeEngine.
 *
 * Goal: No monoliths, 100% de-duplication.
 */

// --- AUTHORITATIVE DELEGATION ---
export * from "./systems/narrative/NarrativeBands";
export * from "./systems/narrative/NarrativeProse";
export * from "./systems/narrative/NarrativeService";

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
