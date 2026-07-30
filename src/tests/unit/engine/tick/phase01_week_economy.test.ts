import { describe, it, expect, vi } from "vitest";
import { phase01_week_economy } from "@/engine/tick/phases/phase01_week_economy";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import * as finance from "@/engine/systems/economy/FinanceCalculator";
import { RUNWAY_BANDS } from "@/constants/engine/economy";

vi.mock("@/engine/systems/economy/FinanceCalculator", () => ({
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
      .mockReturnValueOnce({ revenue: 100, expenses: 50, totalBurn: 50, nextFunds: 1000, runwayMonths: 12 })
      .mockReturnValueOnce({ revenue: 0, expenses: 100, totalBurn: 100, nextFunds: -500, runwayMonths: 0 });

    const impact = phase01_week_economy(world);

    expect(finance.calculateHeyaWeeklyFinances).toHaveBeenCalledTimes(2);

    const updates = impact.entities?.heyaUpdates;
    expect(updates?.get("h1")).toEqual({ funds: 1000, runwayBand: RUNWAY_BANDS.SECURE });
    expect(updates?.get("h2")).toEqual({ funds: -500, runwayBand: RUNWAY_BANDS.DESPERATE });
  });
});
