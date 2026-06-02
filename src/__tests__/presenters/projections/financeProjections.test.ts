/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { projectFinanceSummary } from "../../../presenters/projections/financeProjections";
import { createMockWorldState, createMockHeya } from "../../utils/testHelpers";

vi.mock("../../../engine/systems/economy/FinanceCalculator", () => ({
  calculateHeyaWeeklyFinances: vi.fn(),
}));

import { calculateHeyaWeeklyFinances } from "../../../engine/systems/economy/FinanceCalculator";

function mockFin(overrides: Partial<any> = {}) {
  return {
    revenue: 1_000_000,
    expenses: 500_000,
    totalBurn: 500_000,
    runwayMonths: 12,
    nextFunds: 1_500_000,
    ...overrides,
  };
}

beforeEach(() => {
  vi.mocked(calculateHeyaWeeklyFinances).mockReturnValue(mockFin());
});

describe("projectFinanceSummary", () => {
  it("returns null when playerHeyaId is absent", () => {
    const world = createMockWorldState({ playerHeyaId: undefined });
    expect(projectFinanceSummary(world as any)).toBeNull();
  });

  it("returns null when player heya is not in map", () => {
    const world = createMockWorldState({ playerHeyaId: "missing" });
    expect(projectFinanceSummary(world as any)).toBeNull();
  });

  describe("runwayBand boundaries", () => {
    const cases: [number, string][] = [
      [24, "secure"],
      [12, "secure"],
      [11, "comfortable"],
      [6, "comfortable"],
      [5, "tight"],
      [3, "tight"],
      [1, "critical"],
      [0.5, "desperate"],
      [0, "desperate"],
    ];
    for (const [months, expected] of cases) {
      it(`runwayMonths=${months} → "${expected}"`, () => {
        vi.mocked(calculateHeyaWeeklyFinances).mockReturnValue(mockFin({ runwayMonths: months }));
        const heya = createMockHeya({ id: "h1", funds: 1_000_000 });
        const world = createMockWorldState({
          playerHeyaId: "h1",
          heyas: new Map([["h1", heya]]),
        });
        expect(projectFinanceSummary(world as any)?.runwayBand).toBe(expected);
      });
    }
  });

  it("isInsolventRisk is true when heya.funds < 0", () => {
    const heya = createMockHeya({ id: "h1", funds: -1 });
    const world = createMockWorldState({
      playerHeyaId: "h1",
      heyas: new Map([["h1", heya]]),
    });
    expect(projectFinanceSummary(world as any)?.isInsolventRisk).toBe(true);
  });

  it("isInsolventRisk is true when runwayBand is desperate", () => {
    vi.mocked(calculateHeyaWeeklyFinances).mockReturnValue(mockFin({ runwayMonths: 0 }));
    const heya = createMockHeya({ id: "h1", funds: 1 });
    const world = createMockWorldState({
      playerHeyaId: "h1",
      heyas: new Map([["h1", heya]]),
    });
    expect(projectFinanceSummary(world as any)?.isInsolventRisk).toBe(true);
  });

  it("isInsolventRisk is false when funds > 0 and runway is not desperate", () => {
    vi.mocked(calculateHeyaWeeklyFinances).mockReturnValue(mockFin({ runwayMonths: 5 }));
    const heya = createMockHeya({ id: "h1", funds: 500_000 });
    const world = createMockWorldState({
      playerHeyaId: "h1",
      heyas: new Map([["h1", heya]]),
    });
    expect(projectFinanceSummary(world as any)?.isInsolventRisk).toBe(false);
  });

  it("koenkaiIncome is a koenkai-only weekly figure (not full revenue)", () => {
    vi.mocked(calculateHeyaWeeklyFinances).mockReturnValue(
      mockFin({ revenue: 5_000_000 })
    );
    const heya = createMockHeya({ id: "h1", funds: 1_000_000, koenkaiBand: "none" });
    const world = createMockWorldState({
      playerHeyaId: "h1",
      heyas: new Map([["h1", heya]]),
    });
    const result = projectFinanceSummary(world as any);
    expect(result?.koenkaiIncome).not.toBe(5_000_000);
    expect(result?.koenkaiIncome).toBe(0);
  });

  it("koenkaiIncome is non-zero for a heya with a koenkaiBand", () => {
    const heya = createMockHeya({ id: "h1", funds: 1_000_000, koenkaiBand: "strong" });
    const world = createMockWorldState({
      playerHeyaId: "h1",
      heyas: new Map([["h1", heya]]),
    });
    const result = projectFinanceSummary(world as any);
    expect(result?.koenkaiIncome).toBeGreaterThan(0);
  });

  it("koenkaiIncomeLabel starts with ¥", () => {
    const heya = createMockHeya({ id: "h1", funds: 1_000_000 });
    const world = createMockWorldState({
      playerHeyaId: "h1",
      heyas: new Map([["h1", heya]]),
    });
    expect(projectFinanceSummary(world as any)?.koenkaiIncomeLabel).toMatch(/^¥/);
  });

  it("hasLoan is false when activeLoans is empty", () => {
    const heya = createMockHeya({ id: "h1", funds: 1_000_000, activeLoans: [] });
    const world = createMockWorldState({
      playerHeyaId: "h1",
      heyas: new Map([["h1", heya]]),
    });
    const result = projectFinanceSummary(world as any);
    expect(result?.hasLoan).toBe(false);
    expect(result?.loanAmount).toBe(0);
  });

  it("hasLoan is true and loanAmount sums remainingBalance across all loans", () => {
    const heya = createMockHeya({
      id: "h1",
      funds: 1_000_000,
      activeLoans: [
        { id: "l1", remainingBalance: 500_000, issuedAtMonth: 1, issuedAtYear: 2024, monthlyPayment: 10_000, type: "emergency", principal: 500_000, interestRate: 0.05, providerName: "JSA" },
        { id: "l2", remainingBalance: 300_000, issuedAtMonth: 1, issuedAtYear: 2024, monthlyPayment: 10_000, type: "supporter", principal: 300_000, interestRate: 0.03, providerName: "Bank" },
      ],
    });
    const world = createMockWorldState({
      playerHeyaId: "h1",
      heyas: new Map([["h1", heya]]),
    });
    const result = projectFinanceSummary(world as any);
    expect(result?.hasLoan).toBe(true);
    expect(result?.loanAmount).toBe(800_000);
  });

  it("isOverdue is false when loan was issued recently", () => {
    const heya = createMockHeya({
      id: "h1",
      funds: 1_000_000,
      activeLoans: [
        { id: "l1", remainingBalance: 100_000, issuedAtMonth: 1, issuedAtYear: 2024, monthlyPayment: 5_000, type: "emergency", principal: 100_000, interestRate: 0.05, providerName: "JSA" },
      ],
    });
    const world = createMockWorldState({
      playerHeyaId: "h1",
      heyas: new Map([["h1", heya]]),
      week: 4,
    });
    expect(projectFinanceSummary(world as any)?.isOverdue).toBe(false);
  });

  it("isOverdue is true when loan month threshold exceeded", () => {
    const heya = createMockHeya({
      id: "h1",
      funds: 1_000_000,
      activeLoans: [
        { id: "l1", remainingBalance: 100_000, issuedAtMonth: 1, issuedAtYear: 2024, monthlyPayment: 5_000, type: "emergency", principal: 100_000, interestRate: 0.05, providerName: "JSA" },
      ],
    });
    const world = createMockWorldState({
      playerHeyaId: "h1",
      heyas: new Map([["h1", heya]]),
      week: 56,
    });
    expect(projectFinanceSummary(world as any)?.isOverdue).toBe(true);
  });

  it("balance and balanceLabel come from heya.funds", () => {
    const heya = createMockHeya({ id: "h1", funds: 3_500_000 });
    const world = createMockWorldState({
      playerHeyaId: "h1",
      heyas: new Map([["h1", heya]]),
    });
    const result = projectFinanceSummary(world as any);
    expect(result?.balance).toBe(3_500_000);
    expect(result?.balanceLabel).toMatch(/^¥/);
    expect(result?.balanceLabel).toContain("3");
  });

  it("weeklyRevenue and weeklyExpenses come from mock fin", () => {
    vi.mocked(calculateHeyaWeeklyFinances).mockReturnValue(
      mockFin({ revenue: 2_000_000, expenses: 800_000 })
    );
    const heya = createMockHeya({ id: "h1", funds: 1_000_000 });
    const world = createMockWorldState({
      playerHeyaId: "h1",
      heyas: new Map([["h1", heya]]),
    });
    const result = projectFinanceSummary(world as any);
    expect(result?.weeklyRevenue).toBe(2_000_000);
    expect(result?.weeklyExpenses).toBe(800_000);
    expect(result?.netWeekly).toBe(1_200_000);
  });

  it("sponsorCount is 0 when no sponsorPool", () => {
    const heya = createMockHeya({ id: "h1", funds: 1_000_000 });
    const world = createMockWorldState({
      playerHeyaId: "h1",
      heyas: new Map([["h1", heya]]),
      sponsorPool: undefined,
    });
    expect(projectFinanceSummary(world as any)?.sponsorCount).toBe(0);
  });

  it("sponsorCount comes from koenkai.members.length", () => {
    const heya = createMockHeya({ id: "h1", funds: 1_000_000, koenkaiId: "kk1" });
    const koenkai = { koenkaiId: "kk1", heyaId: "h1", strengthBand: "moderate", members: [{}, {}, {}], createdAtTick: 0, lastChangedTick: 0 };
    const world = createMockWorldState({
      playerHeyaId: "h1",
      heyas: new Map([["h1", heya]]),
      sponsorPool: { sponsors: new Map(), koenkais: new Map([["kk1", koenkai]]) },
    });
    expect(projectFinanceSummary(world as any)?.sponsorCount).toBe(3);
  });
});
