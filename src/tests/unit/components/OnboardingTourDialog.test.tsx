import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";

const mockCompleteTutorial = vi.fn();
vi.mock("@/contexts/useGame", () => ({
  useGame: () => ({ completeTutorial: mockCompleteTutorial }),
}));

const mockDismissTour = vi.fn();
vi.mock("@/store/gameStore", () => ({
  useGameStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      showTour: true,
      dismissTour: mockDismissTour,
    }),
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

import { OnboardingTourDialog } from "@/components/onboarding/OnboardingTourDialog";

function renderDialog() {
  return render(
    <TooltipProvider>
      <OnboardingTourDialog />
    </TooltipProvider>
  );
}

describe("OnboardingTourDialog — completeTutorial wiring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls completeTutorial when clicking through to the last step", () => {
    renderDialog();
    // Click "Next Guide" twice to reach the last step (3 steps total)
    fireEvent.click(screen.getByText("Next Guide"));
    fireEvent.click(screen.getByText("Next Guide"));
    // Now on last step, button says "Begin Your Legacy"
    fireEvent.click(screen.getByText("Begin Your Legacy"));
    expect(mockCompleteTutorial).toHaveBeenCalledTimes(1);
    expect(mockDismissTour).toHaveBeenCalledWith("completed");
  });

  it("calls completeTutorial when skipping the tour", () => {
    renderDialog();
    fireEvent.click(screen.getByText("Skip Tour"));
    expect(mockCompleteTutorial).toHaveBeenCalledTimes(1);
    expect(mockDismissTour).toHaveBeenCalledWith("skipped");
  });
});
