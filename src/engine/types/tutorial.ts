/**
 * tutorial.ts — TutorialState type definition.
 * Tracks onboarding progress for new players.
 */

export type TutorialStep =
  | "EXHIBITION_INTRO"
  | "FIRST_BASHO_STARTED"
  | "TOUR_BANZUKE"
  | "TOUR_RIVALRIES"
  | "TOUR_COMPLETE"
  | "DONE";

export interface TutorialFlags {
  seenStaminaTooltip: boolean;
  seenGripTooltip: boolean;
  seenMomentumTooltip: boolean;
  seenBashoRecordTooltip: boolean;
  finishedExhibition: boolean;
}

export interface TutorialState {
  completed: boolean;
  currentStep: TutorialStep;
  flags: TutorialFlags;
}

export function createDefaultTutorialState(): TutorialState {
  return {
    completed: false,
    currentStep: "EXHIBITION_INTRO",
    flags: {
      seenStaminaTooltip: false,
      seenGripTooltip: false,
      seenMomentumTooltip: false,
      seenBashoRecordTooltip: false,
      finishedExhibition: false,
    },
  };
}
