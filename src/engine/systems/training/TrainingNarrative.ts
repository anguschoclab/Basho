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

import type { TrainingIntensity, TrainingFocus, RecoveryEmphasis } from "../../types/training";
import { BardEngine } from "../../bard/BardEngine";
import { SeededRNG } from "../../rng";

function seededRng(world?: { rng?: SeededRNG }): SeededRNG {
  return (world && world.rng) || new SeededRNG("training_narrative");
}

/**
 * Get intensity label.
 */
export function getIntensityLabel(
  intensity: TrainingIntensity,
  world?: { rng?: SeededRNG }
): string {
  const rng = seededRng(world);
  return BardEngine.resolve(rng, `training.intensity.${intensity}`).text;
}

/**
 * Get focus label.
 */
export function getFocusLabel(focus: TrainingFocus, world?: { rng?: SeededRNG }): string {
  const rng = seededRng(world);
  return BardEngine.resolve(rng, `training.focus.${focus}`).text;
}

/**
 * Get recovery label.
 */
export function getRecoveryLabel(recovery: RecoveryEmphasis, world?: { rng?: SeededRNG }): string {
  const rng = seededRng(world);
  return BardEngine.resolve(rng, `training.recovery.${recovery}`).text;
}

/**
 * Get focus mode label (individual slots).
 */
export function getFocusModeLabel(mode: string, world?: { rng?: SeededRNG }): string {
  const rng = seededRng(world);
  return BardEngine.resolve(rng, `training.mode.${mode}`).text;
}
