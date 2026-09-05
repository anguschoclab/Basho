/**
 * HistoryDashboard.cohorts.test.tsx — tests cohort view renders.
 * Plan Feature 5 Test-First Protocol item 3.
 */
import React from "react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

vi.mock("@/components/layout/AppLayout", () => ({
  AppLayout: ({ children }: any) => React.createElement("div", null, children),
}));

vi.mock("@/contexts/useGame", () => ({
  useGame: () => ({
    state: {
      world: {
        seed: "test",
        year: 2026,
        playerHeyaId: "h1",
        heyas: new Map(),
        rikishi: new Map(),
        activeRikishiIds: [],
        records: {},
      },
    },
  }),
}));

vi.mock("@/presenters/selectors", () => ({
  selectRetiredRikishi: () => [],
}));

vi.mock("@/presenters/worldAccess", () => ({
  getAllHeyas: () => [],
}));

vi.mock("@/presenters/projections/historyCohortProjections", () => ({
  selectCohortSummaries: () => [
    {
      cohortId: "2025-hatsu",
      totalMembers: 3,
      activeMembers: 2,
      retiredMembers: 1,
      sekitoriCount: 1,
      totalYusho: 0,
      topProspects: [
        { rikishiId: "r1", shikona: "TopRiki", rank: "makuuchi", isRetired: false },
      ],
    },
  ],
}));

vi.mock("@/components/ui/EmptyState", () => ({
  EmptyState: () => React.createElement("div", null, "Empty"),
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children, ...props }: any) => React.createElement("div", props, children),
  CardContent: ({ children }: any) => React.createElement("div", null, children),
  CardHeader: ({ children }: any) => React.createElement("div", null, children),
  CardTitle: ({ children, ...props }: any) => React.createElement("div", props, children),
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children, ...props }: any) => React.createElement("span", props, children),
}));

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }: any) => React.createElement("div", null, children),
  TabsContent: ({ children, value }: any) =>
    value === "cohorts"
      ? React.createElement("div", { "data-testid": `tab-${value}` }, children)
      : null,
  TabsList: ({ children }: any) => React.createElement("div", null, children),
  TabsTrigger: ({ children, value }: any) => React.createElement("button", { "data-testid": `trigger-${value}` }, children),
}));

vi.mock("@/components/ui/SortMenu", () => ({
  SortMenu: () => null,
}));

vi.mock("@/components/layout/control-center", () => ({
  PageHeader: () => null,
  StatCard: () => null,
  ListCard: () => null,
  SectionHeader: () => null,
}));

import { HistoryDashboard } from "@/pages/HistoryDashboard";

describe("HistoryDashboard cohorts tab", () => {
  afterEach(() => cleanup());

  it("renders cohorts tab with cohort data", () => {
    render(<HistoryDashboard />);
    expect(screen.getByTestId("cohorts-tab")).toBeDefined();
    expect(screen.getByTestId("cohort-2025-hatsu")).toBeDefined();
  });

  it("displays cohort member counts", () => {
    render(<HistoryDashboard />);
    expect(screen.getByText("3")).toBeDefined();
  });

  it("renders top prospects", () => {
    render(<HistoryDashboard />);
    expect(screen.getByText("TopRiki")).toBeDefined();
  });
});
