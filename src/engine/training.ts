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
import { TrainingService } from "./systems/training/TrainingService";

// --- AUTHORITATIVE DELEGATION ---
export * from "./systems/training/TrainingConstants";
export * from "./systems/training/TrainingMath";
export * from "./systems/training/TrainingService";
export * from "./systems/training/TrainingNarrative";

/**
 * Tick week training (Wrapper for tickWeekly.ts)
 */
export function tickWeekTraining(world: WorldState) {
  TrainingService.applyWeeklyTraining(world);
}

// Re-export type definitions for backward compatibility
export type { 
  TrainingIntensity, 
  TrainingFocus, 
  RecoveryEmphasis, 
  BeyaTrainingState, 
  TrainingProfile 
} from "./types/training";
