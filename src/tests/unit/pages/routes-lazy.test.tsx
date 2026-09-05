import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";

vi.mock("@/contexts/useGame", () => ({
  useGame: vi.fn(() => ({
    state: { world: null, phase: "interim" },
    createWorld: vi.fn(),
    hasAutosave: () => false,
    loadFromAutosave: vi.fn(),
    loadFromSlot: vi.fn(),
    getSaveSlots: () => [],
    quickSave: vi.fn(),
    updateWorld: vi.fn(),
  })),
}));

vi.mock("@/presenters/uiDigest", () => ({
  projectDashboardUIDigest: () => ({ stats: { sekitoriCount: 0 } }),
  projectHeyaRosterWithAge: () => [],
  recruitSponsor: vi.fn(),
  buildWeeklyDigest: () => null,
}));

vi.mock("@/presenters/projections/stableSelectionProjections", () => ({
  selectStablesByStature: () => ({
    legendary: [],
    powerful: [],
    established: [],
    rebuilding: [],
    fragile: [],
    new: [],
  }),
  selectRecommendedStables: () => [],
}));

vi.mock("@/presenters/engineAccess", () => ({
  getSekitoriInHeya: () => 0,
}));

vi.mock("@/presenters/worldAccess", () => ({
  getAllHeyas: () => [],
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

vi.mock("@/presenters/projections/promotionProjections", () => ({
  getOzekiRunCandidates: () => [],
  getYokozunaCandidates: () => [],
  getKadobanDrama: () => [],
}));

vi.mock("@/presenters/projections/actionQueue", () => ({
  buildActionQueue: () => [],
}));

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
  AcademyWidget: () => <div data-testid="academy-widget" />,
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

vi.mock("@/components/stable/SuccessionModal", () => ({
  SuccessionModal: () => null,
}));

vi.mock("@/components/ui/SkeletonCard", () => ({
  SkeletonCard: () => <div data-testid="skeleton" />,
}));

vi.mock("@/store/gameStore", () => ({
  useGameStore: (selector: (s: unknown) => unknown) =>
    selector({ sendCommand: vi.fn() }),
}));

import { router } from "@/routes";

describe("routes lazy loading — Suspense fallback for MainMenu, NewGameWizard, Dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("MainMenu route uses a function component (not a direct component reference)", () => {
    const route = router.routesById["/main-menu"] as unknown as {
      options: { component: unknown };
    };
    expect(route).toBeDefined();
    expect(typeof route.options.component).toBe("function");
  });

  it("NewGameWizard route uses a function component (not a direct component reference)", () => {
    const route = router.routesById["/new-game"] as unknown as {
      options: { component: unknown };
    };
    expect(route).toBeDefined();
    expect(typeof route.options.component).toBe("function");
  });

  it("Dashboard route uses a function component (not a direct component reference)", () => {
    const route = router.routesById["/dashboard"] as unknown as {
      options: { component: unknown };
    };
    expect(route).toBeDefined();
    expect(typeof route.options.component).toBe("function");
  });

  it("MainMenu component renders inside a Suspense boundary", async () => {
    const route = router.routesById["/main-menu"] as unknown as {
      options: { component: () => React.ReactElement };
    };
    const result = route.options.component();
    expect(result.type).toBe(
      (await import("react")).Suspense
    );
  });

  it("Dashboard component renders inside a Suspense boundary", async () => {
    const route = router.routesById["/dashboard"] as unknown as {
      options: { component: () => React.ReactElement };
    };
    const result = route.options.component();
    expect(result.type).toBe(
      (await import("react")).Suspense
    );
  });
});
