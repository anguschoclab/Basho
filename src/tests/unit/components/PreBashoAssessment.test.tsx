 
/**
 */
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PreBashoAssessment } from "@/components/dashboard/PreBashoAssessment";

vi.mock("@/contexts/GameContext", () => ({
  useGame: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: vi.fn(() => ({ to: () => {} })),
}));

vi.mock("@/components/ClickableName", () => ({
  RikishiName: ({ name }: { name: string }) => <span>{name}</span>,
}));

import { useGame } from "@/contexts/useGame";

function mockState(world: any) {
  vi.mocked(useGame).mockReturnValue({ state: { world } } as any);
}

function renderWithProvider(ui: React.ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
}

describe("PreBashoAssessment", () => {
  it("renders withdrawal button when withdrawalsThisAssessment > 0", () => {
    mockState({
      cyclePhase: "pre_basho",
      _preBashoAssessment: {
        withdrawalsThisAssessment: 2,
        overallHealthScore: 60,
        rikishiAssessments: new Map(),
      },
      _interimDaysRemaining: 5,
      rikishi: new Map(),
    });
    renderWithProvider(<PreBashoAssessment />);
    expect(screen.getByText("View Roster for Withdrawals")).toBeTruthy();
  });

  it("hides withdrawal button when withdrawalsThisAssessment === 0", () => {
    mockState({
      cyclePhase: "pre_basho",
      _preBashoAssessment: {
        withdrawalsThisAssessment: 0,
        overallHealthScore: 90,
        rikishiAssessments: new Map(),
      },
      _interimDaysRemaining: 5,
      rikishi: new Map(),
    });
    renderWithProvider(<PreBashoAssessment />);
    expect(screen.queryByText("View Roster for Withdrawals")).toBeNull();
  });

  it("returns null when no assessment exists", () => {
    mockState({
      cyclePhase: "pre_basho",
      _preBashoAssessment: undefined,
      rikishi: new Map(),
    });
    const { container } = renderWithProvider(<PreBashoAssessment />);
    expect(container.firstChild).toBeNull();
  });

  it("returns null when not in pre_basho phase", () => {
    mockState({
      cyclePhase: "active_basho",
      _preBashoAssessment: {
        withdrawalsThisAssessment: 1,
        overallHealthScore: 50,
        rikishiAssessments: new Map(),
      },
      rikishi: new Map(),
    });
    const { container } = renderWithProvider(<PreBashoAssessment />);
    expect(container.firstChild).toBeNull();
  });

  it("renders health score badge when assessment has rikishi assessments", () => {
    const assessments = new Map();
    assessments.set("r1", {
      injuryRisk: "low",
      withdrawalRecommended: false,
      recommendedFocus: "normal",
      healthScore: 80,
    });
    mockState({
      cyclePhase: "pre_basho",
      _preBashoAssessment: {
        withdrawalsThisAssessment: 0,
        overallHealthScore: 75,
        rikishiAssessments: assessments,
      },
      _interimDaysRemaining: 3,
      rikishi: new Map([
        ["r1", { id: "r1", shikona: "TestRikishi" }],
      ]),
    });
    renderWithProvider(<PreBashoAssessment />);
    expect(screen.getByText("75%")).toBeTruthy();
  });

  it("renders days remaining in header content", () => {
    mockState({
      cyclePhase: "pre_basho",
      _preBashoAssessment: {
        withdrawalsThisAssessment: 0,
        overallHealthScore: 80,
        rikishiAssessments: new Map(),
      },
      _interimDaysRemaining: 7,
      rikishi: new Map(),
    });
    renderWithProvider(<PreBashoAssessment />);
    expect(screen.getByText(/7 days left/)).toBeTruthy();
  });
});
