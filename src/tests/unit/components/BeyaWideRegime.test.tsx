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
    const buttons = screen.getAllByRole("button");
    const intensityLabels = buttons.filter((b) =>
      ["light", "moderate", "heavy", "maximum"].some((label) =>
        b.getAttribute("aria-label")?.includes(label)
      )
    );
    expect(intensityLabels.length).toBeGreaterThan(0);
  });

  it("intensity buttons have aria-pressed matching active state", () => {
    render(
      <BeyaWideRegime
        trainingState={baseTrainingState}
        onIntensityChange={noop}
        onFocusChange={noop}
        onRecoveryChange={noop}
      />
    );
    const buttons = screen.getAllByRole("button");
    const moderateBtn = buttons.find((b) =>
      b.textContent?.toLowerCase().includes("moderate")
    );
    expect(moderateBtn).toBeDefined();
    expect(moderateBtn?.getAttribute("aria-pressed")).toBe("true");
  });

  it("inactive intensity buttons have aria-pressed=false", () => {
    render(
      <BeyaWideRegime
        trainingState={baseTrainingState}
        onIntensityChange={noop}
        onFocusChange={noop}
        onRecoveryChange={noop}
      />
    );
    const buttons = screen.getAllByRole("button");
    const lightBtn = buttons.find((b) =>
      b.textContent?.toLowerCase().includes("light")
    );
    expect(lightBtn).toBeDefined();
    expect(lightBtn?.getAttribute("aria-pressed")).toBe("false");
  });
});
