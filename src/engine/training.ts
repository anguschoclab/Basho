/**
 * File Name: src/engine/training.ts
 * Status: REFACTORED / SERVICE-ORIENTED
 * 
 * This is now a barrel file that orchestrates the Training system.
 * Delegated to specialized sub-services in src/engine/systems/training/.
 * 
 * Goal: No monoliths, high-fidelity modularity.
 */

import type { WorldState } from "./types/world";
import type { Id } from "./types/common";
import type { BeyaTrainingState } from "./types/training";
import { TrainingService } from "./systems/training/TrainingService";

// --- AUTHORITATIVE DELEGATION ---
export * from "./systems/training/TrainingConstants";
export * from "./systems/training/TrainingMath";
export * from "./systems/training/TrainingService";
export * from "./systems/training/TrainingNarrative";

/**
 * @deprecated Tick week training is now handled by the phase01_week_training pipeline.
 */
export function tickWeekTraining(world: WorldState) {
  // DEPRECATED
}

/**
 * Ensure heya training state exists (Legacy wrapper).
 */
export function ensureHeyaTrainingState(world: WorldState, heyaId: Id): BeyaTrainingState {
  return TrainingService.ensureHeyaTrainingState(world, heyaId);
}

/**
 * Create default training state for a heya (Legacy wrapper).
 */
export function createDefaultTrainingState(heyaId: Id): BeyaTrainingState {
  return TrainingService.createDefaultTrainingState(heyaId);
}

// Re-export type definitions for backward compatibility
export type { 
  TrainingIntensity, 
  TrainingFocus, 
  RecoveryEmphasis, 
  BeyaTrainingState, 
  TrainingProfile 
} from "./types/training";
