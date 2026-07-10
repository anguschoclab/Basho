/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PreBashoAssessment } from "@/components/dashboard/PreBashoAssessment";

vi.mock("@/contexts/GameContext", () => ({
  useGame: vi.fn(),
}));

vi.mock("@/components/ClickableName", () => ({
  RikishiName: ({ name }: { name: string }) => <span>{name}</span>,
}));

import { useGame } from "@/contexts/GameContext";

function mockState(world: any) {
  vi.mocked(useGame).mockReturnValue({ state: { world } } as any);
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
    render(<PreBashoAssessment />);
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
    render(<PreBashoAssessment />);
    expect(screen.queryByText("View Roster for Withdrawals")).toBeNull();
  });

  it("returns null when no assessment exists", () => {
    mockState({
      cyclePhase: "pre_basho",
      _preBashoAssessment: undefined,
      rikishi: new Map(),
    });
    const { container } = render(<PreBashoAssessment />);
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
    const { container } = render(<PreBashoAssessment />);
    expect(container.firstChild).toBeNull();
  });
});
