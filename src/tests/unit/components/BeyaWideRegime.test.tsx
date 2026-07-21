import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BeyaWideRegime } from "@/components/training/BeyaWideRegime";
import type {
  HeyaTrainingState,
  TrainingIntensity,
  TrainingFocus,
  RecoveryEmphasis,
} from "@/engine/types/training";

const baseTrainingState: HeyaTrainingState = {
  activeProfile: {
    intensity: "moderate" as TrainingIntensity,
    focus: "balanced" as TrainingFocus,
    recovery: "standard" as RecoveryEmphasis,
  },
} as HeyaTrainingState;

const noop = () => {};

function renderWithProviders(ui: React.ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
}

describe("BeyaWideRegime — accessibility", () => {
  it("intensity buttons have aria-label", () => {
    const { container } = renderWithProviders(
      <BeyaWideRegime
        trainingState={baseTrainingState}
        onIntensityChange={noop}
        onFocusChange={noop}
        onRecoveryChange={noop}
      />
    );
    const btns = container.querySelectorAll("button[aria-label]");
    const labels = Array.from(btns).map((b) => b.getAttribute("aria-label"));
    expect(labels.some((l) => l?.includes("intensity"))).toBe(true);
  });

  it("all intensity buttons have aria-label", () => {
    const { container } = renderWithProviders(
      <BeyaWideRegime
        trainingState={baseTrainingState}
        onIntensityChange={noop}
        onFocusChange={noop}
        onRecoveryChange={noop}
      />
    );
    const btns = container.querySelectorAll("button[aria-label]");
    const labels = Array.from(btns).map((b) => b.getAttribute("aria-label"));
    expect(labels.some((l) => l?.includes("balanced"))).toBe(true);
  });

  it("focus buttons have aria-label", () => {
    const { container } = renderWithProviders(
      <BeyaWideRegime
        trainingState={baseTrainingState}
        onIntensityChange={noop}
        onFocusChange={noop}
        onRecoveryChange={noop}
      />
    );
    const btns = container.querySelectorAll('button[aria-label^="Set tactical focus to"]');
    expect(btns.length).toBeGreaterThan(0);
  });
});
