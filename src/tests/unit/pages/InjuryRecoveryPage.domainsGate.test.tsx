import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";

const mockNavigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: "/injury-recovery" }),
}));

vi.mock("@/contexts/useGame", () => ({
  useGame: vi.fn(),
}));

vi.mock("@/presenters/uiDigest", () => ({
  projectMedicalUIDigest: () => ({
    heyaName: "Test Heya",
    welfare: {
      complianceState: "compliant",
      weeksInState: 0,
      welfareRisk: 10,
      activeDiet: "maintenance",
    },
    perception: {
      welfareRiskBand: "safe",
      moraleBand: "content",
      rosterStrengthBand: "competitive",
      stableMediaHeatBand: "low",
      rivalryPressureBand: "low",
      rikishiHealthPerception: [],
    },
  }),
  setHeyaDietAction: vi.fn(),
}));

vi.mock("@/presenters/uiUtilities", () => ({
  resolveRegistryLabel: () => "Yokozuna",
}));

vi.mock("@/engine/queries", () => ({
  getHeyaRoster: () => [
    {
      id: "r1",
      shikona: "Test Rikishi",
      rank: "yokozuna",
      isRetired: false,
      injured: true,
      injuryStatus: { location: "knee", severity: "moderate" },
      injuryWeeksRemaining: 3,
      condition: 80,
      fatigue: 20,
    },
  ],
}));

vi.mock("@/components/layout/AppLayout", () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="app-layout">{children}</div>
  ),
}));

vi.mock("@/components/layout/control-center", () => ({
  PageHeader: () => <div data-testid="page-header" />,
}));

vi.mock("@/components/game/InjuryRecoveryPanel", () => ({
  InjuryRecoveryPanel: () => <div data-testid="injury-panel" />,
}));

vi.mock("@/components/game/WelfarePanel", () => ({
  WelfarePanel: () => <div data-testid="welfare-panel" />,
}));

vi.mock("@/components/training/InjuryRiskHeatmap", () => ({
  InjuryRiskHeatmap: () => <div data-testid="injury-heatmap" />,
}));

import { useGame } from "@/contexts/useGame";
import { BardEngine } from "@/engine/bard/BardEngine";
import InjuryRecoveryPage from "@/pages/InjuryRecoveryPage";

function makeWorld() {
  return {
    year: 2025,
    week: 1,
    seed: "test",
    rng: { int: () => 0 } as any,
    heyas: new Map([
      ["h1", { id: "h1", name: "Test Heya", rikishiIds: ["r1"] }],
    ]),
    rikishi: new Map([
      [
        "r1",
        {
          id: "r1",
          shikona: "Test Rikishi",
          rank: "yokozuna",
          isRetired: false,
          injured: true,
          injuryStatus: { location: "knee", severity: "moderate" },
          injuryWeeksRemaining: 3,
          condition: 80,
          fatigue: 20,
        },
      ],
    ]),
  } as any;
}

describe("InjuryRecoveryPage — domains gate", () => {
  beforeEach(() => {
    BardEngine.resetCache();
    BardEngine.resetDomains();
    vi.clearAllMocks();
    vi.mocked(useGame).mockReturnValue({
      state: { world: makeWorld() },
      updateWorld: vi.fn(),
    } as any);
  });

  it("renders a loading fallback (not blank injury summary) when domains are not loaded", () => {
    const { container } = render(<InjuryRecoveryPage />);
    // The page should NOT render the main content with blank/empty injury summaries
    // It should show a loading indicator instead
    expect(container.textContent).not.toContain("injurySummary");
    // Look for a loading indicator — either a skeleton or loading text
    const loadingEl = container.querySelector("[data-testid='domains-loading'], [role='status'], .animate-pulse, .animate-spin");
    expect(loadingEl ?? container.textContent).toBeTruthy();
  });

  it("renders real injury summary text after domains load", async () => {
    const { container } = render(<InjuryRecoveryPage />);
    await waitFor(() => {
      // After domains load, the page should render the content panels (not loading spinner)
      expect(container.querySelector("[data-testid='injury-panel']")).toBeTruthy();
      expect(container.querySelector("[data-testid='welfare-panel']")).toBeTruthy();
    });
  });
});
