import { describe, it, expect } from "vitest";
import { createDefaultTutorialState, type TutorialStep } from "@/engine/types/tutorial";

const ALL_STEPS: TutorialStep[] = [
  "EXHIBITION_INTRO",
  "FIRST_BASHO_STARTED",
  "TOUR_BANZUKE",
  "TOUR_RIVALRIES",
  "TOUR_COMPLETE",
  "DONE",
];

describe("createDefaultTutorialState", () => {
  it("returns the expected initial state", () => {
    const state = createDefaultTutorialState();

    expect(state.completed).toBe(false);
    expect(state.currentStep).toBe("EXHIBITION_INTRO");
    expect(state.flags.seenStaminaTooltip).toBe(false);
    expect(state.flags.seenGripTooltip).toBe(false);
    expect(state.flags.seenMomentumTooltip).toBe(false);
    expect(state.flags.seenBashoRecordTooltip).toBe(false);
    expect(state.flags.finishedExhibition).toBe(false);
  });

  it("starts at a valid TutorialStep", () => {
    expect(ALL_STEPS).toContain(createDefaultTutorialState().currentStep);
  });

  it("returns a fresh object per call (no shared default)", () => {
    const a = createDefaultTutorialState();
    a.flags.seenStaminaTooltip = true;
    a.completed = true;

    const b = createDefaultTutorialState();
    expect(b.flags.seenStaminaTooltip).toBe(false);
    expect(b.completed).toBe(false);
  });
});
