/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { EventFeed } from "@/components/dashboard/EventFeed";
import { InstitutionWidget } from "@/components/dashboard/InstitutionWidget";

vi.mock("@/contexts/GameContext", () => ({
  useGame: vi.fn(),
}));

vi.mock("@/components/layout/control-center", () => ({
  WidgetCard: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  WidgetHeader: ({ title }: { title: string }) => <div>{title}</div>,
}));

vi.mock("@/components/ClickableName", () => ({
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

import { useGame } from "@/contexts/GameContext";

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

  it("InstitutionWidget renders 'No stable selected' when no heya", () => {
    mockState({
      world: { heyas: new Map() },
      playerHeyaId: null,
    });
    render(<InstitutionWidget />);
    expect(screen.getByText("No stable selected")).toBeTruthy();
  });

  it("InstitutionWidget renders 'No stable selected' when world is null", () => {
    mockState({
      world: null,
      playerHeyaId: "heya1",
    });
    render(<InstitutionWidget />);
    expect(screen.getByText("No stable selected")).toBeTruthy();
  });
});
