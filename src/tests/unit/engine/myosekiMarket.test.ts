import { describe, it, expect } from "vitest";
import { buyMyoseki, leaseMyoseki } from "../../../engine/myosekiMarket";
import type { WorldState, MyosekiMarket } from "../../../engine/types";
import { MYOSEKI_LEASE_RATE_PERCENT } from "../../../constants/engine/economic";
import { IdMapRuntime, Id } from "../../../engine/types";

describe("buyMyoseki", () => {
  it("processes a successful purchase and deducts funds", () => {
    const stockId = "myoseki_1" as Id;
    const buyerId = "oyakata_1" as Id;
    const heyaId = "heya-1" as Id;

    const mockHeyaMap = new Map();
    mockHeyaMap.set(heyaId, {
      id: heyaId,
      funds: 5000,
      prestige: 10,
      reputation: 10,
      facilities: [],
      rikishiIds: [],
      oyakataId: buyerId,
    });

    const world = {
      seed: "test",
      myosekiMarket: {
        stocks: {
          [stockId]: {
            id: stockId,
            name: "Test Name",
            prestigeTier: "standard",
            basePrice: 100,
            askingPrice: 1000,
            status: "available",
            holderId: "jsa",
            history: [],
          },
        },
      } as unknown as MyosekiMarket,
      heyas: mockHeyaMap as unknown as IdMapRuntime<any>,
    } as unknown as WorldState;

    const impact = buyMyoseki(world, buyerId, heyaId, stockId);

    expect(impact.entities?.heyaUpdates?.get(heyaId)?.funds).toBe(4000);
    expect(impact.entities?.myosekiUpdates?.get(stockId)?.status).toBe("held");
    expect(impact.entities?.myosekiUpdates?.get(stockId)?.holderId).toBe(buyerId);
  });
});

describe("leaseMyoseki", () => {
  it("processes a lease transaction and sets the lease fee", () => {
    const stockId = "myoseki_1" as Id;
    const lesseeId = "oyakata_1" as Id;

    const world = {
      myosekiMarket: {
        stocks: {
          [stockId]: {
            id: stockId,
            name: "Test Name",
            prestigeTier: "standard",
            basePrice: 100,
            askingPrice: 1000000,
            status: "available",
            holderId: "jsa",
            history: [],
          },
        },
      } as unknown as MyosekiMarket,
    } as unknown as WorldState;

    const impact = leaseMyoseki(world, lesseeId, stockId);

    expect(impact.entities?.myosekiUpdates?.get(stockId)?.status).toBe("leased");
    expect(impact.entities?.myosekiUpdates?.get(stockId)?.holderId).toBe(lesseeId);
    expect(impact.entities?.myosekiUpdates?.get(stockId)?.leaseFee).toBe(
      Math.floor(1000000 * MYOSEKI_LEASE_RATE_PERCENT)
    );
  });
});
