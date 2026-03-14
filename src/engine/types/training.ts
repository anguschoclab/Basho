/**
 * Training Types
 */

import type { Id } from "./common";

export type TrainingIntensity = "conservative" | "balanced" | "intensive" | "punishing";
export type TrainingFocus = "power" | "speed" | "technique" | "balance" | "neutral";
export type StyleBias = "oshi" | "yotsu" | "neutral";
export type RecoveryEmphasis = "low" | "normal" | "high";
export type FocusMode = "develop" | "push" | "protect" | "rebuild";
export type IndividualFocusType = FocusMode;

export interface TrainingProfile {
  intensity: TrainingIntensity;
  focus: TrainingFocus;
  styleBias: StyleBias;
  recovery: RecoveryEmphasis;
}

export interface IndividualFocus {
  rikishiId: Id;
  focusType: FocusMode;
}

export interface BeyaTrainingState {
  beyaId: Id;
  activeProfile: TrainingProfile;
  focusSlots: IndividualFocus[];
}
