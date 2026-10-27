import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { IncomeExpensesCards } from "@/components/economy/IncomeExpensesCards";
import { formatYen } from "@/lib/engineUtils";

const yen = (n: number) => new RegExp(formatYen(n).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

function makeFinances(overrides = {}) {
  return {
    revenue: 5_000_000,
    expenses: 2_000_000,
    totalBurn: 2_000_000,
    runwayMonths: 24,
    nextFunds: 53_000_000,
    income: {
      koenkai: 999_999,
      jsaSubsidy: 111_111,
      sponsorTier: 222_222,
      jsaGrant: 333_333,
      oyakataSalary: 444_444,
      ...overrides,
    },
    outgoings: {
      facilityUpkeep: 600_000,
      staffUpkeep: 400_000,
      fixedOverhead: 700_000,
      recruitment: 300_000,
    },
  };
}

describe("IncomeExpensesCards — real breakdown binding", () => {
  it("renders the engine-computed income components, not fixed fractions", () => {
    render(<IncomeExpensesCards weeklyFinances={makeFinances() as any} />);
    // Deliberately non-0.4/0.35/0.25 values — if the UI recomputes fractions
    // of revenue these assertions fail.
    expect(screen.getByText(yen(999_999))).toBeTruthy();
    expect(screen.getByText(yen(111_111))).toBeTruthy();
    expect(screen.getByText(yen(222_222))).toBeTruthy();
    expect(screen.getByText(yen(333_333))).toBeTruthy();
    expect(screen.getByText(yen(444_444))).toBeTruthy();
  });

  it("renders the engine-computed expense components", () => {
    render(<IncomeExpensesCards weeklyFinances={makeFinances() as any} />);
    expect(screen.getByText(yen(600_000))).toBeTruthy();
    expect(screen.getByText(yen(400_000))).toBeTruthy();
    expect(screen.getByText(yen(700_000))).toBeTruthy();
    expect(screen.getByText(yen(300_000))).toBeTruthy();
  });

  it("never renders an '(estimated)' suffix", () => {
    render(<IncomeExpensesCards weeklyFinances={makeFinances() as any} />);
    expect(screen.queryByText(/estimated/i)).toBeNull();
  });

  it("hides zero-value rows rather than inventing presence", () => {
    const f = makeFinances();
    f.income.sponsorTier = 0;
    render(<IncomeExpensesCards weeklyFinances={f as any} />);
    expect(screen.queryByText("Sponsor Tier Income")).toBeNull();
  });

  it("keeps the honest empty state when finances are unavailable", () => {
    render(<IncomeExpensesCards weeklyFinances={null} />);
    expect(screen.getAllByText(/unavailable/i).length).toBeGreaterThan(0);
  });
});
