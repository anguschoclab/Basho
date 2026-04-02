/**
 * src/engine/systems/training/TrainingNarrative.ts
 * =================================================
 * UI Narrative and Label helpers for the Training system.
 * 
 * Provides human-readable descriptions and localized (EN/JA) labels 
 * for Training Intensity, Focus, and Recovery.
 * 
 * Goal: Clean UI bridge and separation of concerns.
 */

import type { 
  TrainingIntensity, 
  TrainingFocus, 
  RecoveryEmphasis 
} from "../../types/training";

/**
 * Get intensity label.
 */
export function getIntensityLabel(intensity: TrainingIntensity): string {
  const labels: Record<TrainingIntensity, string> = {
    conservative: "Conservative",
    balanced: "Balanced",
    intensive: "Intensive",
    punishing: "Punishing"
  };
  return labels[intensity] || intensity;
}

/**
 * Get focus label.
 */
export function getFocusLabel(focus: TrainingFocus): string {
  const labels: Record<TrainingFocus, string> = {
    power: "Power",
    speed: "Speed",
    technique: "Technique",
    balance: "Balance",
    neutral: "Neutral"
  };
  return labels[focus] || focus;
}

/**
 * Get recovery label.
 */
export function getRecoveryLabel(recovery: RecoveryEmphasis): string {
  const labels: Record<RecoveryEmphasis, string> = {
    low: "Low",
    normal: "Normal",
    high: "High"
  };
  return labels[recovery] || recovery;
}

/**
 * Get focus mode label (individual slots).
 */
export function getFocusModeLabel(mode: string): string {
  const labels: Record<string, string> = {
    develop: "Develop",
    push: "Push",
    protect: "Protect",
    rebuild: "Rebuild"
  };
  return labels[mode] || mode;
}
