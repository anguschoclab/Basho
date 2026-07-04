/**
 * @vitest-environment jsdom
 *
 * Focused integration test for the SuccessionModal render block in Dashboard.
 * Mocks all dashboard widgets, AppLayout, and companion modals to isolate the
 * succession dismissal behavior.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import Dashboard from "@/pages/Dashboard";
import * as GameContext from "@/contexts/GameContext";
import type { GameState } from "@/contexts/gameTypes";

// ── Mocks (hoisted by vitest) ──────────────────────────────

vi.mock("@/components/layout/AppLayout", () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="app-layout">{children}</div>
  ),
}));

vi.mock("@/components/layout/control-center", () => ({
  PageHeader: () => <div data-testid="page-header" />,
  StatCard: () => <div data-testid="stat-card" />,
  ListCard: () => <div data-testid="list-card" />,
  ProgressRow: () => <div data-testid="progress-row" />,
}));

vi.mock("@/components/dashboard", () => ({
  FinancesWidget: () => <div data-testid="finances-widget" />,
  BashoWidget: () => <div data-testid="basho-widget" />,
  TrendsWidget: () => <div data-testid="trends-widget" />,
  CalendarWidget: () => <div data-testid="calendar-widget" />,
  StableWidget: () => <div data-testid="stable-widget" />,
  ScoutingWidget: () => <div data-testid="scouting-widget" />,
  TrainingWidget: () => <div data-testid="training-widget" />,
  RivalsWidget: () => <div data-testid="rivals-widget" />,
  RosterWidget: () => <div data-testid="roster-widget" />,
  BanzukeWidget: () => <div data-testid="banzuke-widget" />,
  GlobalCupWidget: () => <div data-testid="global-cup-widget" />,
  EventFeed: () => <div data-testid="event-feed" />,
  PromotionPipelineWidget: () => <div data-testid="promotion-widget" />,
  InstitutionWidget: () => <div data-testid="institution-widget" />,
  KenshoManagementWidget: () => <div data-testid="kensho-widget" />,
  SponsorRecruitmentWidget: () => <div data-testid="sponsor-widget" />,
  YushoRaceWidget: () => <div data-testid="yusho-widget" />,
  PreBashoAssessment: () => <div data-testid="pre-basho-widget" />,
  ActionQueueWidget: () => <div data-testid="action-queue-widget" />,
}));

vi.mock("@/components/game/ProgressionTracker", () => ({
  ProgressionTracker: () => <div data-testid="progression-tracker" />,
}));

vi.mock("@/components/onboarding/OnboardingTourDialog", () => ({
  OnboardingTourDialog: () => null,
}));

vi.mock("@/components/game/CrisisModal", () => ({
  CrisisModal: () => null,
}));

vi.mock("@/components/ui/SkeletonCard", () => ({
  SkeletonCard: () => <div data-testid="skeleton" />,
}));

vi.mock("@/presenters/projections/promotionProjections", () => ({
  getOzekiRunCandidates: () => [],
  getYokozunaCandidates: () => [],
  getKadobanDrama: () => [],
}));

vi.mock("@/presenters/uiDigest", () => ({
  projectDashboardUIDigest: () => ({ stats: { sekitoriCount: 0 } }),
}));

vi.mock("@/presenters/projections/financeProjections", () => ({
  projectFinanceSummary: () => ({
    weeklyRevenue: 0,
    weeklyExpenses: 0,
    runwayMonths: 0,
    runwayBand: "secure",
  }),
}));

vi.mock("@/presenters/projections/trainingProjections", () => ({
  projectTrainingSummary: () => ({
    intensity: "medium",
    focus: "balanced",
    injuryRiskHighCount: 0,
    recovery: "rest",
    avgFatigue: 0,
    avgFatigueBand: "fresh",
    injuredCount: 0,
    rosterStatuses: [],
  }),
}));

vi.mock("@/presenters/projections/actionQueue", () => ({
  buildActionQueue: () => [],
}));

// SuccessionModal mock — captures props via a shared array we can assert against
const successionProps: any[] = [];
vi.mock("@/components/stable/SuccessionModal", () => ({
  SuccessionModal: (props: any) => {
    successionProps.push(props);
    return <div data-testid="succession-modal" />;
  },
}));

// sendCommand spy — set per-test
let sendCommandSpy: ReturnType<typeof vi.fn>;

vi.mock("@/store/gameStore", () => ({
  useGameStore: (selector: any) => selector({ sendCommand: sendCommandSpy }),
}));

// ── Helpers ────────────────────────────────────────────────

function makeWorld(opts: {
  week?: number;
  readiness?: "stable" | "transitioning" | "mandatory";
} = {}): any {
  const heyaId = "h1";
  const oyakataId = "o1";
  return {
    year: 2024,
    week: opts.week ?? 10,
    cyclePhase: "interim",
    playerHeyaId: heyaId,
    heyas: new Map([
      [heyaId, { id: heyaId, oyakataId, name: "Test Stable", rikishiIds: [] }],
    ]),
    oyakata: new Map([
      [
        oyakataId,
        {
          id: oyakataId,
          heyaId,
          name: "Old Oyakata",
          shikona: "Ex-Old",
          age: 65,
          archetype: "traditionalist",
          traits: { ambition: 50, patience: 50, risk: 50, tradition: 50, compassion: 50 },
          yearsInCharge: 10,
          successionReadiness: opts.readiness ?? "mandatory",
        },
      ],
    ]),
    rikishi: new Map(),
    activeRikishiIds: new Set(),
    events: { log: [] },
  };
}

function mockUseGame(world: any) {
  const gameState: Partial<GameState> = {
    world,
    phase: "interim",
    playerHeyaId: "h1",
    playerOyakataId: "o1",
    currentBoutIndex: 0,
    lastBoutResult: null,
    isAutoPlaying: false,
    boutTactics: {},
    digest: null,
  };
  vi.spyOn(GameContext, "useGame").mockReturnValue({
    state: gameState as GameState,
    hasAutosave: () => false,
    loadFromAutosave: vi.fn(),
  } as any);
}

function getLastProps(): any {
  return successionProps[successionProps.length - 1];
}

// ── Tests ──────────────────────────────────────────────────

describe("Dashboard — succession modal render block", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    successionProps.length = 0;
    sendCommandSpy = vi.fn();
  });

  it("does not render SuccessionModal when readiness is 'stable'", () => {
    mockUseGame(makeWorld({ readiness: "stable" }));
    render(<Dashboard />);
    expect(successionProps).toHaveLength(0);
  });

  it("does not render SuccessionModal when readiness is 'transitioning'", () => {
    mockUseGame(makeWorld({ readiness: "transitioning" }));
    render(<Dashboard />);
    expect(successionProps).toHaveLength(0);
  });

  it("renders SuccessionModal when readiness is 'mandatory'", () => {
    mockUseGame(makeWorld({ readiness: "mandatory" }));
    render(<Dashboard />);
    expect(successionProps).toHaveLength(1);
    expect(getLastProps().isOpen).toBe(true);
  });

  it("clicking close sets dismissed for current week", () => {
    mockUseGame(makeWorld({ week: 10, readiness: "mandatory" }));
    const { rerender } = render(<Dashboard />);
    expect(successionProps).toHaveLength(1);

    // Call onClose — simulates dismissing the modal
    getLastProps().onClose();

    // Re-render — the modal should not appear because we're still on week 10
    rerender(<Dashboard />);
    expect(successionProps).toHaveLength(1);
  });

  it("modal reappears after week advances", () => {
    mockUseGame(makeWorld({ week: 10, readiness: "mandatory" }));
    const { rerender } = render(<Dashboard />);
    expect(successionProps).toHaveLength(1);

    // Dismiss
    getLastProps().onClose();

    // Advance week — new world with week 11
    mockUseGame(makeWorld({ week: 11, readiness: "mandatory" }));
    rerender(<Dashboard />);
    expect(successionProps).toHaveLength(2);
  });

  it("onSelect dispatches TRIGGER_SUCCESSION", () => {
    mockUseGame(makeWorld({ readiness: "mandatory" }));
    render(<Dashboard />);
    expect(successionProps).toHaveLength(1);

    getLastProps().onSelect("r1");
    expect(sendCommandSpy).toHaveBeenCalledWith({
      type: "TRIGGER_SUCCESSION",
      heyaId: "h1",
      successorId: "r1",
    });
  });
});
