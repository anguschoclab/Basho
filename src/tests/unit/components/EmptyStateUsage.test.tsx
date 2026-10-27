/**
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { EventFeed } from "@/components/dashboard/EventFeed";
import { StableHealthWidget } from "@/components/dashboard/StableHealthWidget";

vi.mock("@/state/game/useGame", () => ({
  useGame: vi.fn(),
}));

vi.mock("@/components/layout/page-shell/index", () => ({
  WidgetCard: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  WidgetHeader: ({ title }: { title: string }) => <div>{title}</div>,
}));

vi.mock("@/components/shared/ClickableName", () => ({
  RikishiName: ({ name }: { name: string }) => <span>{name}</span>,
}));

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Bar: () => <div />,
  Cell: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  Tooltip: () => <div />,
  CartesianGrid: () => <div />,
}));

vi.mock("@/presenters/projections/institutionUI", () => ({
  projectHeyaData: vi.fn(() => null),
}));

import { useGame } from "@/state/game/useGame";

function mockState(state: any) {
  vi.mocked(useGame).mockReturnValue({ state } as any);
}

describe("EmptyState usage in dashboard widgets", () => {
  it("EventFeed renders 'No recent events' message when empty", () => {
    mockState({
      workerWorld: { events: { log: [] } },
    });
    render(<EventFeed />);
    expect(screen.getByText("No recent events")).toBeTruthy();
  });

  it("StableHealthWidget renders 'No stable selected' when no heya", () => {
    mockState({
      world: { heyas: new Map() },
      playerHeyaId: null,
    });
    render(<StableHealthWidget />);
    expect(screen.getByText("No stable selected")).toBeTruthy();
  });

  it("StableHealthWidget renders 'No stable selected' when world is null", () => {
    mockState({
      world: null,
      playerHeyaId: "heya1",
    });
    render(<StableHealthWidget />);
    expect(screen.getByText("No stable selected")).toBeTruthy();
  });
});
