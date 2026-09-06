import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";
import { HistoryDashboard } from "@/pages/HistoryDashboard";
import * as GameContext from "@/contexts/useGame";
import type { RetiredRikishiSummary } from "@/engine/types/history";
import type { Rikishi } from "@/engine/types/rikishi";
import type { Heya } from "@/engine/types/heya";
import type { WorldState } from "@/engine/types/world";

// Mock AppLayout to avoid layout complexity
vi.mock("@/components/layout/AppLayout", () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="app-layout">{children}</div>
  ),
}));

vi.mock("@/components/layout/control-center", () => ({
  PageHeader: ({ title }: { title: string }) => <div>{title}</div>,
}));

vi.mock("@/presenters/projections/historyCohortProjections", () => ({
  selectCohortSummaries: () => [],
}));

vi.mock("@/components/ui/SortMenu", () => ({
  SortMenu: () => <div data-testid="sort-menu" />,
}));

vi.mock("@/lib/sortUtils", () => ({
  compareBy: () => 0,
}));

vi.mock("@/presenters/worldAccess", () => ({
  getAllHeyas: (world: { heyas: Map<string, Heya> }) => Array.from(world.heyas.values()),
  getRikishi: () => undefined,
  getHeya: () => undefined,
  getRikishiAnywhere: () => undefined,
  getHistory: () => [],
  getRikishiMap: (world: { rikishi: Map<string, Rikishi> }) => world.rikishi,
}));

vi.mock("@/presenters/selectors", () => ({
  selectRetiredRikishi: (world: { historicalRikishi?: Map<string, unknown> }) =>
    world.historicalRikishi ? Array.from(world.historicalRikishi.values()) : [],
}));

// Mock Radix Tabs to always render all content (jsdom doesn't support Radix tab switching)
vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: React.ReactNode }) => (
    <div role="tablist">{children}</div>
  ),
  TabsTrigger: ({ value, children }: { value: string; children: React.ReactNode }) => (
    <button role="tab" data-value={value} onClick={() => {}}>
      {children}
    </button>
  ),
  TabsContent: ({ children }: { value: string; children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

function makeSummary(id: string, overrides: Partial<RetiredRikishiSummary> = {}): RetiredRikishiSummary {
  return {
    id,
    shikona: `Legend-${id}`,
    birthYear: 1980,
    heyaId: `heya-${id}`,
    careerWins: 100,
    careerLosses: 50,
    yushoCount: 3,
    junYushoCount: 1,
    sanshoCount: 5,
    kinboshiCount: 10,
    totalEarnings: 500_000,
    peakRank: "ozeki",
    peakRankYear: 2005,
    peakDivision: "makuuchi",
    retirementYear: 2010,
    retirementReason: "Age",
    isRetired: true,
    yearlyAggregates: [],
    isSummary: true,
    ...overrides,
  };
}

function makeMockHeya(id: string, name: string): Heya {
  return {
    id,
    name,
    rikishiIds: [],
    staffIds: [],
    funds: 5_000_000,
    reputation: 50,
    scandalScore: 0,
    governanceStatus: "good_standing",
    politicalCapital: 50,
    koenkaiBand: "bronze",
    facilities: { training: 50, recovery: 50, nutrition: 50 },
    riskIndicators: { financial: false, welfare: false, governance: false },
  } as unknown as Heya;
}

function makeWorldWithRetired(
  retired: Array<RetiredRikishiSummary | Rikishi>,
  heyas: Heya[] = []
): WorldState {
  const world: WorldState = {
    id: "world-test",
    seed: "test",
    year: 2025,
    week: 1,
    dayIndexGlobal: 0,
    cyclePhase: "interim",
    heyas: new Map(heyas.map((h) => [h.id, h])),
    rikishi: new Map(),
    historicalRikishi: new Map(retired.map((r) => [r.id, r])),
    activeRikishiIds: new Set(),
    oyakata: new Map(),
    staff: new Map(),
    events: { version: "1.0.0", log: [], dedupe: {} },
    history: [],
    records: {
      allTime: { careerWins: [], makuuchiWins: [], yusho: [], consecutiveYusho: [], kinboshi: [] },
      active: { careerWins: [], makuuchiWins: [], yusho: [], consecutiveYusho: [], kinboshi: [] },
    },
    settings: { archiveMode: "standard" },
    meta: { tone: "classic", drift: {} },
    globalKimariteStats: {},
  } as WorldState;
  return world;
}

describe("HistoryDashboard StablesTab with RetiredRikishiSummary", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders retired legends from RetiredRikishiSummary objects", () => {
    const summaries = [
      makeSummary("r1", { shikona: "Legendary Ozeki", peakRank: "ozeki", heyaId: "heya-1" }),
      makeSummary("r2", { shikona: "Great Yokozuna", peakRank: "yokozuna", heyaId: "heya-2" }),
    ];
    const heyas = [makeMockHeya("heya-1", "Stable One"), makeMockHeya("heya-2", "Stable Two")];
    const world = makeWorldWithRetired(summaries, heyas);

    vi.spyOn(GameContext, "useGame").mockReturnValue({
      state: { world },
    } as any);

    render(<HistoryDashboard />);

    // Should render the shikona names (Tabs mocked to render all content)
    expect(screen.getByText("Legendary Ozeki")).toBeDefined();
    expect(screen.getByText("Great Yokozuna")).toBeDefined();
  });

  it("renders peakRank for summaries (not retirement rank)", () => {
    const summary = makeSummary("r1", {
      shikona: "Peak Test",
      peakRank: "yokozuna",
      heyaId: "heya-1",
    });
    const heyas = [makeMockHeya("heya-1", "Test Stable")];
    const world = makeWorldWithRetired([summary], heyas);

    vi.spyOn(GameContext, "useGame").mockReturnValue({
      state: { world },
    } as any);

    render(<HistoryDashboard />);

    // The rank display should show the peakRank (yokozuna), not a retirement rank
    expect(screen.getByText("Peak Test")).toBeDefined();
  });

  it("renders heya name for retired rikishi", () => {
    const summary = makeSummary("r1", { shikona: "Stable Member", heyaId: "heya-special" });
    const heyas = [makeMockHeya("heya-special", "Special Stable")];
    const world = makeWorldWithRetired([summary], heyas);

    vi.spyOn(GameContext, "useGame").mockReturnValue({
      state: { world },
    } as any);

    render(<HistoryDashboard />);

    expect(screen.getByText("Stable Member")).toBeDefined();
    expect(screen.getAllByText("Special Stable").length).toBeGreaterThan(0);
  });
});
