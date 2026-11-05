/**
 * KimariteDistributionChart.test.tsx
 *
 * Render pins for the wins-by-technique chart: the "record N more
 * wins" empty-state cue below the minimum threshold and the
 * recorded-wins caption once data is present. Recharts is mocked.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { KimariteDistributionChart } from "@/components/rikishi/KimariteDistributionChart";

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Bar: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  Tooltip: () => <div />,
  CartesianGrid: () => <div />,
  Cell: () => <div />,
}));

function tech(name: string, wins: number) {
  return { name, wins, percentage: 10 };
}

describe("KimariteDistributionChart", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders the progress cue below 5 recorded wins", () => {
    render(<KimariteDistributionChart rows={[tech("Yorikiri", 3)]} totalWins={3} />);
    expect(screen.getByText(/Record 2 more wins/i)).toBeTruthy();
  });

  it("renders the empty state with no data", () => {
    render(<KimariteDistributionChart rows={[]} totalWins={0} />);
    expect(screen.getByText(/Record 5 more wins/i)).toBeTruthy();
  });

  it("renders the chart and recorded-wins caption at 5+ wins", () => {
    render(
      <KimariteDistributionChart
        rows={[tech("Yorikiri", 4), tech("Oshidashi", 1)]}
        totalWins={5}
      />
    );
    expect(screen.getByText(/5 recorded wins/i)).toBeTruthy();
  });
});
