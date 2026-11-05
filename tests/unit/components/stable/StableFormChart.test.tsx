/**
 * StableFormChart.test.tsx
 *
 * Render pins for the stable Basho Form chart: the "complete N more
 * Basho" empty-state cue below the minimum data threshold and the
 * chart caption once data is present. Recharts is mocked.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { StableFormChart } from "@/components/stable/StableFormChart";
import type { StableBashoFormRow } from "@/presenters/projections/heyaProjections";

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Bar: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  Tooltip: () => <div />,
  CartesianGrid: () => <div />,
  Legend: () => <div />,
}));

function row(overrides: Partial<StableBashoFormRow> = {}): StableBashoFormRow {
  return { basho: "Hatsu 2025", wins: 11, losses: 4, kachiKoshi: 2, rikishi: 3, ...overrides };
}

describe("StableFormChart", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders the progress cue when no basho have data", () => {
    render(<StableFormChart data={[]} />);
    expect(screen.getByText(/Complete 2 more Basho/i)).toBeTruthy();
  });

  it("renders the remaining-count cue for a single basho", () => {
    render(<StableFormChart data={[row()]} />);
    expect(screen.getByText(/Complete 1 more Basho/i)).toBeTruthy();
  });

  it("renders the chart chrome once 2+ basho have data", () => {
    render(<StableFormChart data={[row(), row({ basho: "Haru 2025" })]} />);
    expect(screen.queryByText(/more Basho to surface/i)).toBeNull();
    expect(screen.getByText(/current roster members/i)).toBeTruthy();
  });
});
