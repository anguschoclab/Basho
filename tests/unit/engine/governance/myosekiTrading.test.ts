import { describe, it, expect } from "vitest";
import {
  listMyosekiForSale,
  purchaseMyoseki,
  returnLeasedMyoseki,
  findAvailableStock,
} from "@/engine/governance/services/MyosekiTradingService";
import { leaseMyoseki, tickMyosekiMarket } from "@/engine/governance/myosekiMarket";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { makeMockWorld, makeMockHeya } from "@tests/unit/engine/utils";
import type { MyosekiMarket } from "@/engine/types/myoseki";

/** Deterministic two-stock market fixture (JSA-owned, available). */
function makeMarket(): MyosekiMarket {
  return {
    stocks: {
      "myoseki-1": {
        id: "myoseki-1",
        name: "Takanohana",
        prestigeTier: "elite",
        ownerId: "JSA",
        holderId: "JSA",
        status: "available",
        askingPrice: 500_000_000,
      },
      "myoseki-2": {
        id: "myoseki-2",
        name: "Kitanoumi",
        prestigeTier: "respected",
        ownerId: "JSA",
        holderId: "JSA",
        status: "available",
        askingPrice: 200_000_000,
      },
    },
    history: [],
  } as MyosekiMarket;
}

function makeWorldWithMarket(market?: MyosekiMarket) {
  const world = makeMockWorld({});
  if (market) {
    (world as any).myosekiMarket = market;
  }
  return world;
}

describe("Myoseki sale listing", () => {
  it("can list a held stock for sale with asking price", () => {
    const market = makeMarket();
    const stockId = Object.keys(market.stocks)[0];
    market.stocks[stockId].status = "held";
    market.stocks[stockId].ownerId = "oyakata-1";
    market.stocks[stockId].holderId = "oyakata-1";

    const worldWithMarket = makeWorldWithMarket(market);
    const impact = listMyosekiForSale(worldWithMarket, market, stockId, 300_000_000);
    const updated = resolveImpacts(worldWithMarket, [impact]);
    const updatedMarket = (updated as any).myosekiMarket as MyosekiMarket;

    expect(updatedMarket.stocks[stockId].askingPrice).toBe(300_000_000);
    expect(updatedMarket.stocks[stockId].status).toBe("available");
  });

  it("cannot list a leased stock for sale", () => {
    const market = makeMarket();
    const stockId = Object.keys(market.stocks)[0];
    market.stocks[stockId].status = "leased";
    market.stocks[stockId].ownerId = "oyakata-1";
    market.stocks[stockId].holderId = "oyakata-2";

    const worldWithMarket = makeWorldWithMarket(market);
    const impact = listMyosekiForSale(worldWithMarket, market, stockId, 300_000_000);
    const updated = resolveImpacts(worldWithMarket, [impact]);
    const updatedMarket = (updated as any).myosekiMarket as MyosekiMarket;

    expect(updatedMarket.stocks[stockId].status).toBe("leased");
    expect(updatedMarket.stocks[stockId].askingPrice).not.toBe(300_000_000);
  });

  it("cannot list an available stock for sale", () => {
    const market = makeMarket();
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
    const market = makeMarket();
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
    const market = makeMarket();
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
    const market = makeMarket();
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
    const market = makeMarket();
    const stockId = Object.keys(market.stocks)[0];
    market.stocks[stockId].ownerId = "oyakata-owner";
    market.stocks[stockId].holderId = "oyakata-owner";

    const worldWithMarket = makeWorldWithMarket(market);
    const impact = leaseMyoseki(worldWithMarket, "oyakata-lessee", stockId);
    const updated = resolveImpacts(worldWithMarket, [impact]);
    const updatedMarket = (updated as any).myosekiMarket as MyosekiMarket;

    expect(updatedMarket.stocks[stockId].ownerId).toBe("oyakata-owner");
    expect(updatedMarket.stocks[stockId].holderId).toBe("oyakata-lessee");
    expect(updatedMarket.stocks[stockId].status).toBe("leased");
    expect(updatedMarket.stocks[stockId].leaseFee).toBe(Math.floor(500_000_000 * 0.05));
    expect(updatedMarket.history.length).toBe(1);
    expect(updatedMarket.history[0].type).toBe("lease");
  });

  it("return lease reverts holderId to ownerId", () => {
    const market = makeMarket();
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
    const market = makeMarket();
    const available = findAvailableStock(market);
    expect(available).toBeDefined();
    expect(available!.status).toBe("available");
  });

  it("findAvailableStock returns undefined when no available stock", () => {
    const market = makeMarket();
    // Mark all as held
    for (const id of Object.keys(market.stocks)) {
      market.stocks[id].status = "held";
    }
    const available = findAvailableStock(market);
    expect(available).toBeUndefined();
  });
});

/**
 * V18 — self-dealing guards.
 *
 * `buyMyoseki` (myosekiMarket.ts) already treats `stock.ownerId === buyerId`
 * as a no-op; the active TradingService's `purchaseMyoseki` has no such
 * guard — it debits the buyer's heya, then skips the seller credit when
 * seller and buyer resolve to the same heya (MyosekiTradingService.ts:113),
 * destroying the price. `leaseMyoseki` likewise lacks an owner-vs-lessee
 * guard, and the weekly market tick then drains the "lessee" forever while
 * its own owner-side credit is suppressed.
 */
describe("V18 — purchaseMyoseki self-purchase", () => {
  it("buying your own listing must not destroy heya funds", () => {
    const market = makeMarket();
    const stockId = "myoseki-1";
    market.stocks[stockId].ownerId = "oya-1";
    market.stocks[stockId].holderId = "oya-1";
    // status stays "available" — the stock is listed by its own owner

    const world = makeMockWorld({
      heyas: new Map([
        ["h-self", makeMockHeya("h-self", { funds: 600_000_000, oyakataId: "oya-1" })],
      ]),
      oyakata: new Map([["oya-1", { id: "oya-1", heyaId: "h-self" } as never]]),
    });
    (world as any).myosekiMarket = market;

    const impact = purchaseMyoseki(world, market, stockId, "oya-1", 600_000_000);
    const resolved = resolveImpacts(world, [impact]);
    const resolvedMarket = (resolved as any).myosekiMarket as MyosekiMarket;

    // Guard parity with buyMyoseki: self-purchase is a no-op.
    expect(resolved.heyas.get("h-self")!.funds).toBe(600_000_000);
    expect(resolvedMarket.stocks[stockId].status).toBe("available");
    expect(resolvedMarket.history.length).toBe(0);
  });
});

describe("V18 — leaseMyoseki self-lease", () => {
  it("leasing your own stock must not enable a recurring self-drain", () => {
    const world = makeMockWorld({
      heyas: new Map([
        ["h-self", makeMockHeya("h-self", { funds: 10_000, oyakataId: "oya-1" })],
      ]),
      oyakata: new Map([["oya-1", { id: "oya-1", heyaId: "h-self" } as never]]),
      myosekiMarket: {
        stocks: {
          s1: {
            id: "s1",
            name: "SelfStock",
            prestigeTier: "respected",
            ownerId: "oya-1",
            holderId: "oya-1",
            status: "available",
            askingPrice: 520_000,
          },
        },
        history: [],
      } as never,
    });

    const afterLease = resolveImpacts(world, [leaseMyoseki(world, "oya-1", "s1")]);
    // A self-held lease must not drain: the tick debits the lessee
    // unconditionally while the owner credit is suppressed for same-heya
    // leases (tickMyosekiMarket) — a weekly leak out of thin air.
    const afterTick = resolveImpacts(afterLease, [tickMyosekiMarket(afterLease)]);
    expect(afterTick.heyas.get("h-self")!.funds).toBe(10_000);
    // Owner-vs-lessee parity with buyMyoseki's self-purchase guard.
    expect(afterLease.myosekiMarket!.stocks["s1"].status).toBe("available");
  });
});

/**
 * V18 — deterministic transaction ids.
 *
 * TradingService mints tx ids from `purchase-${myosekiId}` / `return-${myosekiId}`
 * labels on a fresh SeededRNG — identical labels mint identical MT-* ids.
 * Repeating a sale or return on the same stock (real ops, resolved between
 * steps the way the command path resolves each call) collides. The lower-level
 * `getMyosekiTransaction` already embeds type/participants/year/week/amount.
 */
describe("V18 — myoseki transaction id uniqueness", () => {
  it("reselling the same stock mints distinct transaction ids", () => {
    const market = makeMarket();
    const stockId = "myoseki-1";
    const price = market.stocks[stockId].askingPrice!;
    const world = makeWorldWithMarket(market);

    // oya-1 buys from JSA → holds
    const w1 = resolveImpacts(world, [
      purchaseMyoseki(world, market, stockId, "oyakata-1", price),
    ]);
    const m1 = (w1 as any).myosekiMarket as MyosekiMarket;
    // oya-1 re-lists → available again
    const w2 = resolveImpacts(w1, [listMyosekiForSale(w1, m1, stockId, price)]);
    const m2 = (w2 as any).myosekiMarket as MyosekiMarket;
    // oya-2 buys the same stock → second "purchase-${id}" label → same MT id
    const w3 = resolveImpacts(w2, [
      purchaseMyoseki(w2, m2, stockId, "oyakata-2", price),
    ]);
    const history = ((w3 as any).myosekiMarket as MyosekiMarket).history;

    expect(history.length).toBe(2);
    expect(new Set(history.map((t) => t.id)).size).toBe(2);
  });

  it("re-leasing then returning the same stock mints distinct return ids", () => {
    const market = makeMarket();
    const stockId = "myoseki-1";
    const world = makeWorldWithMarket(market);

    // lease → return → re-list → lease again → return again
    const w1 = resolveImpacts(world, [leaseMyoseki(world, "oyakata-a", stockId)]);
    const m1 = (w1 as any).myosekiMarket as MyosekiMarket;
    const w2 = resolveImpacts(w1, [returnLeasedMyoseki(w1, m1, stockId)]);
    const m2 = (w2 as any).myosekiMarket as MyosekiMarket;
    const w3 = resolveImpacts(w2, [
      listMyosekiForSale(w2, m2, stockId, 500_000_000),
    ]);
    const m3 = (w3 as any).myosekiMarket as MyosekiMarket;
    const w4 = resolveImpacts(w3, [leaseMyoseki(w3, "oyakata-b", stockId)]);
    const m4 = (w4 as any).myosekiMarket as MyosekiMarket;
    const w5 = resolveImpacts(w4, [returnLeasedMyoseki(w4, m4, stockId)]);
    const history = ((w5 as any).myosekiMarket as MyosekiMarket).history;

    // Both "return-${id}" labels minted the same MT id on identical rng streams.
    const returnIds = history.filter((t) => t.type === "return").map((t) => t.id);
    expect(returnIds.length).toBe(2);
    expect(new Set(returnIds).size).toBe(2);
  });
});

describe("Transaction history", () => {
  it("purchase appends to history", () => {
    const market = makeMarket();
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
    const market = makeMarket();
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
