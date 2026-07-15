/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { FinancialTrendsChart } from "@/components/economy/FinancialTrendsChart";

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  ComposedChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="composed-chart">{children}</div>
  ),
  Bar: () => <div />,
  Line: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  Legend: () => <div />,
}));

describe("FinancialTrendsChart", () => {
  it("renders chart when enough ledger history exists", () => {
    render(
      <FinancialTrendsChart
        ledger={[
          {
            amount: 1_000,
            description: "Ticket sales",
            category: "income",
            date: { year: 2025, month: 1, week: 10 },
          },
          {
            amount: -500,
            description: "Supplies",
            category: "expense",
            date: { year: 2025, month: 1, week: 10 },
          },
          {
            amount: 2_000,
            description: "Sponsorship",
            category: "income",
            date: { year: 2025, month: 1, week: 11 },
          },
        ]}
        currentYear={2025}
        currentWeek={11}
      />
    );
    expect(screen.getByText("Financial Flow — Last 12 Weeks")).toBeTruthy();
    expect(screen.getByTestId("responsive-container")).toBeTruthy();
  });

  it("renders empty state when ledger has fewer than 3 entries", () => {
    render(
      <FinancialTrendsChart
        ledger={[{ amount: 1_000, description: "One", category: "income" }]}
        currentYear={2025}
        currentWeek={1}
      />
    );
    expect(screen.getByText("Not enough financial history yet.")).toBeTruthy();
  });
});
