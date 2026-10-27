import { describe, it, expect, vi } from "vitest";
import { phase01_week_economy } from "@/engine/tick/phases/phase01_week_economy";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import * as finance from "@/engine/economy/FinanceCalculator";
import { RUNWAY_BANDS } from "@/constants/engine/economy";

vi.mock("@/engine/economy/FinanceCalculator", () => ({
  calculateHeyaWeeklyFinances: vi.fn(),
}));

describe("phase01_week_economy", () => {
  it("updates funds and runway band for heyas", () => {
    const world = MockFactory.createWorld({
      heyas: new Map([
        ["h1", MockFactory.createHeya("h1")],
        ["h2", MockFactory.createHeya("h2")],
      ]),
    });

    vi.mocked(finance.calculateHeyaWeeklyFinances)
      .mockReturnValueOnce({
        revenue: 100,
        expenses: 50,
        totalBurn: 50,
        nextFunds: 1000,
        runwayMonths: 12,
        income: { koenkai: 0, jsaSubsidy: 0, sponsorTier: 0, jsaGrant: 100, oyakataSalary: 0 },
        outgoings: { facilityUpkeep: 50, staffUpkeep: 0, fixedOverhead: 0, recruitment: 0 },
      })
      .mockReturnValueOnce({
        revenue: 0,
        expenses: 100,
        totalBurn: 100,
        nextFunds: -500,
        runwayMonths: 0,
        income: { koenkai: 0, jsaSubsidy: 0, sponsorTier: 0, jsaGrant: 0, oyakataSalary: 0 },
        outgoings: { facilityUpkeep: 100, staffUpkeep: 0, fixedOverhead: 0, recruitment: 0 },
      });

    const impact = phase01_week_economy(world);

    expect(finance.calculateHeyaWeeklyFinances).toHaveBeenCalledTimes(2);

    const updates = impact.entities?.heyaUpdates;
    expect(updates?.get("h1")).toEqual({ funds: 1000, runwayBand: RUNWAY_BANDS.SECURE });
    expect(updates?.get("h2")).toEqual({ funds: -500, runwayBand: RUNWAY_BANDS.DESPERATE });
  });
});
