import React from "react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import * as GameContext from "@/state/game/useGame";
import TrendsPage from "@/pages/TrendsPage";

vi.mock("@/state/game/useGame");

vi.mock("@/components/layout/AppLayout", () => ({
  AppLayout: ({ children }: any) => React.createElement("div", null, children),
}));

vi.mock("@/components/layout/page-shell/index", () => ({
  PageHeader: ({ title }: any) => React.createElement("div", null, title),
}));

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  AreaChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Area: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  Legend: () => <div />,
}));

let mockTrends: unknown[] = [];

vi.mock("@/presenters/uiDigest", () => ({
  formatMetaTrends: () => mockTrends,
}));

vi.mock("@/presenters/worldAccess", () => ({
  getAllHeyas: () => [],
  getAllRikishi: () => [],
  getRikishi: () => undefined,
}));

function mockUseGame(world: any) {
  vi.mocked(GameContext.useGame).mockReturnValue({ state: { world } } as any);
}

const freshWorld = { meta: { tone: "classic" }, history: [] };

describe("TrendsPage", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    mockTrends = [];
  });

  it("shows an empty state instead of a blank chart before the first completed basho", () => {
    mockTrends = [];
    mockUseGame(freshWorld);
    render(<TrendsPage />);
    expect(screen.getByText("No tournaments recorded yet")).toBeTruthy();
    expect(screen.queryByTestId("responsive-container")).toBeNull();
  });

  it("renders the meta chart once basho history exists", () => {
    mockTrends = [
      { basho: "Hatsu 26", tone: "classic", oshi: 33, yotsu: 34, hybrid: 33, topDrift: [] },
    ];
    mockUseGame({ ...freshWorld, history: [{ bashoName: "hatsu", year: 2026 }] });
    render(<TrendsPage />);
    expect(screen.queryByText("No tournaments recorded yet")).toBeNull();
    expect(screen.getByTestId("responsive-container")).toBeTruthy();
  });
});
