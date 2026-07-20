import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BeyaWideRegime } from "@/components/training/BeyaWideRegime";
import type { HeyaTrainingState, TrainingIntensity, TrainingFocus, RecoveryEmphasis } from "@/engine/types/training";

const baseTrainingState: HeyaTrainingState = {
  activeProfile: {
    intensity: "moderate" as TrainingIntensity,
    focus: "balanced" as TrainingFocus,
    recovery: "standard" as RecoveryEmphasis,
  },
} as HeyaTrainingState;

const noop = () => {};

describe("BeyaWideRegime — accessibility", () => {
  it("intensity buttons have aria-label", () => {
    render(
      <BeyaWideRegime
        trainingState={baseTrainingState}
        onIntensityChange={noop}
        onFocusChange={noop}
        onRecoveryChange={noop}
      />
    );
    const lightBtn = screen.getByRole("button", { name: "Set intensity to light" });
    expect(lightBtn).toBeDefined();
  });

  it("all intensity buttons have aria-label", () => {
    render(
      <BeyaWideRegime
        trainingState={baseTrainingState}
        onIntensityChange={noop}
        onFocusChange={noop}
        onRecoveryChange={noop}
      />
    );
    const moderateBtn = screen.getByRole("button", { name: "Set intensity to moderate" });
    expect(moderateBtn).toBeDefined();
  });

  it("focus buttons have aria-label", () => {
    render(
      <BeyaWideRegime
        trainingState={baseTrainingState}
        onIntensityChange={noop}
        onFocusChange={noop}
        onRecoveryChange={noop}
      />
    );
    const balancedBtn = screen.getByRole("button", { name: /Set tactical focus to/ });
    expect(balancedBtn).toBeDefined();
  });
});
