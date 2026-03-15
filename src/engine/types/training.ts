/**
 * Training Types
 */

import type { Id } from "./common";

/** Type representing training intensity. */
export type TrainingIntensity = "conservative" | "balanced" | "intensive" | "punishing";
/** Type representing training focus. */
export type TrainingFocus = "power" | "speed" | "technique" | "balance" | "neutral";
/** Type representing style bias. */
export type StyleBias = "oshi" | "yotsu" | "neutral";
/** Type representing recovery emphasis. */
export type RecoveryEmphasis = "low" | "normal" | "high";
/** Type representing focus mode. */
export type FocusMode = "develop" | "push" | "protect" | "rebuild";
/** Type representing individual focus type. */
export type IndividualFocusType = FocusMode;

/** Defines the structure for training profile. */
export interface TrainingProfile {
  intensity: TrainingIntensity;
  focus: TrainingFocus;
  styleBias: StyleBias;
  recovery: RecoveryEmphasis;
}

/** Defines the structure for individual focus. */
export interface IndividualFocus {
  rikishiId: Id;
  focusType: FocusMode;
}

/** Defines the structure for beya training state. */
export interface BeyaTrainingState {
  beyaId: Id;
  activeProfile: TrainingProfile;
  focusSlots: IndividualFocus[];
}
