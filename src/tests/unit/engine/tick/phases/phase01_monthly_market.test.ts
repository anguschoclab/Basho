import { describe, it, expect, vi } from "vitest";
import { phase01_monthly_market } from "@/engine/tick/phases/phase01_monthly_market";
import { makeMockWorld } from "@/tests/unit/engine/utils";
import { RNGRegistry } from "@/engine/core/RNGRegistry";

describe("phase01_monthly_market", () => {
  it("does nothing if it's not a month boundary", () => {
    const world = makeMockWorld({
      transientContext: {
        boundaries: { monthBoundary: false, yearBoundary: false },
      } as any,
    });

    const impact = phase01_monthly_market(world);
    expect(impact.worldFields).toBeUndefined();
  });

  it("early returns when there are no stocks", () => {
    const world = makeMockWorld({
      transientContext: {
        boundaries: { monthBoundary: true, yearBoundary: false },
      } as any,
      myosekiMarket: {
        stocks: undefined,
      } as any,
    });

    const impact = phase01_monthly_market(world);
    expect(impact.worldFields).toBeUndefined();
  });

  it("drifts stock prices on month boundary using RNG", () => {
    const world = makeMockWorld({
      year: 2024,
      calendar: { currentWeek: 4, month: 1 } as any,
      transientContext: {
        boundaries: { monthBoundary: true, yearBoundary: false },
      } as any,
      myosekiMarket: {
        stocks: {
          "stock1": { id: "stock1", name: "Test Myoseki", status: "available", askingPrice: 100000000, value: 100000000 },
          "stock2": { id: "stock2", name: "Owned Myoseki", status: "owned", heyaId: "heya1", value: 100000000 },
        },
      } as any,
    });

    // Mock RNG to return a specific value (0.9) to make the price drift predictable
    const mockNext = vi.fn().mockReturnValue(0.9);
    vi.spyOn(RNGRegistry, "getSystemRNG").mockReturnValue({ next: mockNext } as any);

    const impact = phase01_monthly_market(world);

    expect(impact.metadata).toBeDefined();

    const newMarket = impact.worldFields?.myosekiMarket;
    expect(newMarket).toBeDefined();
    expect(newMarket?.stocks).toBeDefined();

    // With RNG=0.9, mid=0.5, range=0.06: drift = 1 + (0.9 - 0.5) * 0.06 = 1.024
    // New asking price = 100,000,000 * 1.024 = 102,400,000
    expect(newMarket?.stocks?.["stock1"].askingPrice).toBe(102400000);

    // Owned stock shouldn't get an asking price
    expect(newMarket?.stocks?.["stock2"].askingPrice).toBeUndefined();

    vi.restoreAllMocks();
  });
});
