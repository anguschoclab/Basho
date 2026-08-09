import { describe, it, expect } from "vitest";
import {
  initializeMyosekiMarket,
  listMyosekiForSale,
  purchaseMyoseki,
  leaseMyoseki,
  returnLeasedMyoseki,
  findAvailableStock,
  CANONICAL_MYOSEKI_NAMES,
  MYOSEKI_BASE_PRICES,
} from "@/engine/systems/governance/MyosekiTradingService";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { makeMockWorld } from "../utils";
import type { MyosekiMarket } from "@/engine/types/myoseki";

function makeWorldWithMarket(market?: MyosekiMarket) {
  const world = makeMockWorld({});
  if (market) {
    (world as any).myosekiMarket = market;
  }
  return world;
}

describe("Myoseki market initialization", () => {
  it("initializes with ~105 fixed names", () => {
    const world = makeMockWorld({});
    const market = initializeMyosekiMarket(world);
    expect(Object.keys(market.stocks).length).toBe(CANONICAL_MYOSEKI_NAMES.length);
    expect(CANONICAL_MYOSEKI_NAMES.length).toBeGreaterThanOrEqual(100);
  });

  it("all stocks start as available owned by JSA", () => {
    const world = makeMockWorld({});
    const market = initializeMyosekiMarket(world);
    for (const stock of Object.values(market.stocks)) {
      expect(stock.status).toBe("available");
      expect(stock.ownerId).toBe("JSA");
      expect(stock.holderId).toBe("JSA");
    }
  });

  it("stocks have asking prices based on prestige tier", () => {
    const world = makeMockWorld({});
    const market = initializeMyosekiMarket(world);
    for (const stock of Object.values(market.stocks)) {
      expect(stock.askingPrice).toBe(MYOSEKI_BASE_PRICES[stock.prestigeTier]);
    }
  });

  it("history starts empty", () => {
    const world = makeMockWorld({});
    const market = initializeMyosekiMarket(world);
    expect(market.history).toEqual([]);
  });
});

describe("Myoseki sale listing", () => {
  it("can list a held stock for sale with asking price", () => {
    const world = makeMockWorld({});
    const market = initializeMyosekiMarket(world);
    const stockId = Object.keys(market.stocks)[0];
    market.stocks[stockId].status = "held";
    market.stocks[stockId].ownerId = "oyakata-1";
    market.stocks[stockId].holderId = "oyakata-1";

    const worldWithMarket = makeWorldWithMarket(market);
    const impact = listMyosekiForSale(worldWithMarket, market, stockId, 300_000_000);
    const updated = resolveImpacts(worldWithMarket, [impact]);
    const updatedMarket = (updated as any).myosekiMarket as MyosekiMarket;

    expect(updatedMarket.stocks[stockId].askingPrice).toBe(300_000_000);
  });

  it("cannot list an available stock for sale", () => {
    const world = makeMockWorld({});
    const market = initializeMyosekiMarket(world);
    const stockId = Object.keys(market.stocks)[0];

    const worldWithMarket = makeWorldWithMarket(market);
    const impact = listMyosekiForSale(worldWithMarket, market, stockId, 300_000_000);
    const updated = resolveImpacts(worldWithMarket, [impact]);
    const updatedMarket = (updated as any).myosekiMarket as MyosekiMarket;

    // No change — stock still available with original asking price
    expect(updatedMarket.stocks[stockId].status).toBe("available");
  });
});

describe("Myoseki purchase", () => {
  it("oyakata can purchase available stock with sufficient funds", () => {
    const world = makeMockWorld({});
    const market = initializeMyosekiMarket(world);
    const stockId = Object.keys(market.stocks)[0];
    const price = market.stocks[stockId].askingPrice!;

    const worldWithMarket = makeWorldWithMarket(market);
    const impact = purchaseMyoseki(worldWithMarket, market, stockId, "oyakata-1", price + 1);
    const updated = resolveImpacts(worldWithMarket, [impact]);
    const updatedMarket = (updated as any).myosekiMarket as MyosekiMarket;

    expect(updatedMarket.stocks[stockId].ownerId).toBe("oyakata-1");
    expect(updatedMarket.stocks[stockId].holderId).toBe("oyakata-1");
    expect(updatedMarket.stocks[stockId].status).toBe("held");
    expect(updatedMarket.history.length).toBe(1);
    expect(updatedMarket.history[0].type).toBe("sale");
    expect(updatedMarket.history[0].toId).toBe("oyakata-1");
  });

  it("cannot purchase with insufficient funds", () => {
    const world = makeMockWorld({});
    const market = initializeMyosekiMarket(world);
    const stockId = Object.keys(market.stocks)[0];
    const price = market.stocks[stockId].askingPrice!;

    const worldWithMarket = makeWorldWithMarket(market);
    const impact = purchaseMyoseki(worldWithMarket, market, stockId, "oyakata-1", price - 1);
    const updated = resolveImpacts(worldWithMarket, [impact]);
    const updatedMarket = (updated as any).myosekiMarket as MyosekiMarket;

    expect(updatedMarket.stocks[stockId].ownerId).toBe("JSA");
    expect(updatedMarket.history.length).toBe(0);
  });

  it("cannot purchase a held stock", () => {
    const world = makeMockWorld({});
    const market = initializeMyosekiMarket(world);
    const stockId = Object.keys(market.stocks)[0];
    market.stocks[stockId].status = "held";
    market.stocks[stockId].ownerId = "oyakata-existing";

    const worldWithMarket = makeWorldWithMarket(market);
    const impact = purchaseMyoseki(worldWithMarket, market, stockId, "oyakata-1", 999_999_999);
    const updated = resolveImpacts(worldWithMarket, [impact]);
    const updatedMarket = (updated as any).myosekiMarket as MyosekiMarket;

    expect(updatedMarket.stocks[stockId].ownerId).toBe("oyakata-existing");
  });
});

describe("Myoseki lease", () => {
  it("lease transfers holderId without transferring ownerId", () => {
    const world = makeMockWorld({});
    const market = initializeMyosekiMarket(world);
    const stockId = Object.keys(market.stocks)[0];
    market.stocks[stockId].status = "held";
    market.stocks[stockId].ownerId = "oyakata-owner";
    market.stocks[stockId].holderId = "oyakata-owner";

    const worldWithMarket = makeWorldWithMarket(market);
    const impact = leaseMyoseki(worldWithMarket, market, stockId, "oyakata-lessee", 5_000_000);
    const updated = resolveImpacts(worldWithMarket, [impact]);
    const updatedMarket = (updated as any).myosekiMarket as MyosekiMarket;

    expect(updatedMarket.stocks[stockId].ownerId).toBe("oyakata-owner");
    expect(updatedMarket.stocks[stockId].holderId).toBe("oyakata-lessee");
    expect(updatedMarket.stocks[stockId].status).toBe("leased");
    expect(updatedMarket.stocks[stockId].leaseFee).toBe(5_000_000);
    expect(updatedMarket.history.length).toBe(1);
    expect(updatedMarket.history[0].type).toBe("lease");
  });

  it("return lease reverts holderId to ownerId", () => {
    const world = makeMockWorld({});
    const market = initializeMyosekiMarket(world);
    const stockId = Object.keys(market.stocks)[0];
    market.stocks[stockId].status = "leased";
    market.stocks[stockId].ownerId = "oyakata-owner";
    market.stocks[stockId].holderId = "oyakata-lessee";
    market.stocks[stockId].leaseFee = 5_000_000;

    const worldWithMarket = makeWorldWithMarket(market);
    const impact = returnLeasedMyoseki(worldWithMarket, market, stockId);
    const updated = resolveImpacts(worldWithMarket, [impact]);
    const updatedMarket = (updated as any).myosekiMarket as MyosekiMarket;

    expect(updatedMarket.stocks[stockId].holderId).toBe("oyakata-owner");
    expect(updatedMarket.stocks[stockId].status).toBe("held");
    expect(updatedMarket.stocks[stockId].leaseFee).toBeUndefined();
    expect(updatedMarket.history[0].type).toBe("return");
  });
});

describe("Merit issuance fallback", () => {
  it("findAvailableStock returns an available stock when one exists", () => {
    const world = makeMockWorld({});
    const market = initializeMyosekiMarket(world);
    const available = findAvailableStock(market);
    expect(available).toBeDefined();
    expect(available!.status).toBe("available");
  });

  it("findAvailableStock returns undefined when no available stock", () => {
    const world = makeMockWorld({});
    const market = initializeMyosekiMarket(world);
    // Mark all as held
    for (const id of Object.keys(market.stocks)) {
      market.stocks[id].status = "held";
    }
    const available = findAvailableStock(market);
    expect(available).toBeUndefined();
  });
});

describe("Transaction history", () => {
  it("purchase appends to history", () => {
    const world = makeMockWorld({});
    const market = initializeMyosekiMarket(world);
    const stockId = Object.keys(market.stocks)[0];
    const price = market.stocks[stockId].askingPrice!;

    const worldWithMarket = makeWorldWithMarket(market);
    const impact = purchaseMyoseki(worldWithMarket, market, stockId, "oyakata-1", price);
    const updated = resolveImpacts(worldWithMarket, [impact]);
    const updatedMarket = (updated as any).myosekiMarket as MyosekiMarket;

    expect(updatedMarket.history.length).toBe(1);
    expect(updatedMarket.history[0].myosekiId).toBe(stockId);
    expect(updatedMarket.history[0].amount).toBe(price);
  });

  it("multiple transactions accumulate in history", () => {
    const world = makeMockWorld({});
    const market = initializeMyosekiMarket(world);
    const stockIds = Object.keys(market.stocks).slice(0, 2);
    const price1 = market.stocks[stockIds[0]].askingPrice!;
    const price2 = market.stocks[stockIds[1]].askingPrice!;

    const worldWithMarket = makeWorldWithMarket(market);
    const impact1 = purchaseMyoseki(worldWithMarket, market, stockIds[0], "oyakata-1", price1);
    const updated1 = resolveImpacts(worldWithMarket, [impact1]);
    const market1 = (updated1 as any).myosekiMarket as MyosekiMarket;

    const impact2 = purchaseMyoseki(updated1, market1, stockIds[1], "oyakata-2", price2);
    const updated2 = resolveImpacts(updated1, [impact2]);
    const market2 = (updated2 as any).myosekiMarket as MyosekiMarket;

    expect(market2.history.length).toBe(2);
  });
});
