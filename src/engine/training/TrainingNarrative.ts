/**
 * src/engine/training/TrainingNarrative.ts
 * =================================================
 * UI Narrative and Label helpers for the Training system.
 *
 * Provides human-readable descriptions and localized (EN/JA) labels
 * for Training Intensity, Focus, and Recovery.
 *
 * Goal: Clean UI bridge and separation of concerns.
 */

import type { TrainingIntensity, TrainingFocus, RecoveryEmphasis } from "@/engine/types/training";
import { BardEngine } from "@/engine/bard/BardEngine";
import { SeededRNG } from "@/engine/core/rng";

/**
 * Labels must be deterministic per template key and must not consume a
 * shared world RNG stream — draining a mutable world.rng from a render path
 * would make output depend on call order and corrupt engine determinism.
 */
function seededRng(templateKey: string): SeededRNG {
  return new SeededRNG(`training_narrative:${templateKey}`);
}

/**
 * Get intensity label.
 */
export function getIntensityLabel(intensity: TrainingIntensity): string {
  return BardEngine.resolve(seededRng(`training.intensity.${intensity}`), `training.intensity.${intensity}`).text;
}

/**
 * Get focus label.
 */
export function getFocusLabel(focus: TrainingFocus): string {
  return BardEngine.resolve(seededRng(`training.focus.${focus}`), `training.focus.${focus}`).text;
}

/**
 * Get recovery label.
 */
export function getRecoveryLabel(recovery: RecoveryEmphasis): string {
  return BardEngine.resolve(seededRng(`training.recovery.${recovery}`), `training.recovery.${recovery}`).text;
}

/**
 * Get focus mode label (individual slots).
 */
export function getFocusModeLabel(mode: string): string {
  return BardEngine.resolve(seededRng(`training.mode.${mode}`), `training.mode.${mode}`).text;
}
