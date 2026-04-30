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

/**
 * P2 Phase O: Drill-based Weekly Planning
 */
export type DrillType = "asageiko" | "butsukari" | "teppo" | "moushi-ai" | "shindo" | "none";

/** Map of day index (1-6, Mon-Sat) to DrillType */
export type DaySchedule = Record<number, DrillType>;

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

/** Defines the structure for heya training state. */
export interface HeyaTrainingState {
  heyaId: Id;
  activeProfile: TrainingProfile;
  focusSlots: IndividualFocus[];
  /**
   * P2 Extension: Granular weekly drill plans.
   * If a rikishi has a plan here, it overrides/augments the passive activeProfile growth.
   */
  weeklyPlan?: Record<Id, DaySchedule>;
}
