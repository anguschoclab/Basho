/**
 * Myoseki Active Trading Service
 *
 * Extends the existing myoseki market with active oyakata-to-oyakata
 * sale and lease transactions, a fixed pool of ~105 elder names,
 * and price negotiation based on prestige tier.
 */

import type { Id } from "../../types/common";
import type { MyosekiMarket, MyosekiStock, MyosekiTransaction } from "../../types/myoseki";
import type { WorldState } from "../../types/world";
import type { StateImpact } from "../../core/StateImpact";
import { createImpactBuilder } from "../../core/ImpactBuilder";
import { rngForWorld } from "../../rng";


/** Base asking prices by prestige tier (in yen). */
const MYOSEKI_BASE_PRICES: Record<MyosekiStock["prestigeTier"], number> = {
  elite: 500_000_000,
  respected: 200_000_000,
  modest: 80_000_000,
};

/**
 * List a held myoseki stock for sale with an asking price.
 */
export function listMyosekiForSale(
  _world: WorldState,
  market: MyosekiMarket,
  myosekiId: Id,
  askingPrice: number
): StateImpact {
  const builder = createImpactBuilder("listMyosekiForSale");
  const stock = market.stocks[myosekiId];

  if (!stock || stock.status !== "held") {
    return builder.build();
  }

  const updatedStocks = {
    ...market.stocks,
    [myosekiId]: { ...stock, askingPrice, status: "available" as const },
  };

  builder.updateWorldField("myosekiMarket", {
    ...market,
    stocks: updatedStocks,
  });

  return builder.build();
}

/**
 * Purchase an available myoseki stock.
 * The buyer must have sufficient funds (checked via heya funds).
 */
export function purchaseMyoseki(
  world: WorldState,
  market: MyosekiMarket,
  myosekiId: Id,
  buyerId: Id,
  buyerFunds: number
): StateImpact {
  const builder = createImpactBuilder("purchaseMyoseki");
  const stock = market.stocks[myosekiId];

  if (!stock || stock.status !== "available") {
    return builder.build();
  }

  const price = stock.askingPrice ?? MYOSEKI_BASE_PRICES[stock.prestigeTier];
  if (buyerFunds < price) {
    return builder.build();
  }

  const rng = rngForWorld(world, "myoseki", `purchase-${myosekiId}`);
  const tx: MyosekiTransaction = {
    id: rng.uuid("MT") as Id,
    date: `${world.year}-W${world.week || 1}`,
    myosekiId,
    type: "sale",
    fromId: stock.ownerId,
    toId: buyerId,
    amount: price,
  };

  const updatedStocks = {
    ...market.stocks,
    [myosekiId]: {
      ...stock,
      ownerId: buyerId,
      holderId: buyerId,
      status: "held" as const,
      askingPrice: undefined,
    },
  };

  builder.updateWorldField("myosekiMarket", {
    ...market,
    stocks: updatedStocks,
    history: [tx, ...market.history],
  });

  // Debit the buyer — previously NPC purchases transferred the stock but left
  // funds untouched (free elder shares).
  builder.updateHeya(buyerId, { funds: buyerFunds - price });

  return builder.build();
}

/**
 * Lease a myoseki stock — transfers holderId without transferring ownerId.
 */
export function executeMyosekiLease(
  world: WorldState,
  market: MyosekiMarket,
  myosekiId: Id,
  lesseeId: Id,
  annualLeaseFee: number
): StateImpact {
  const builder = createImpactBuilder("executeMyosekiLease");
  const stock = market.stocks[myosekiId];

  if (!stock || stock.status === "available") {
    return builder.build();
  }

  const rng = rngForWorld(world, "myoseki", `lease-${myosekiId}`);
  const tx: MyosekiTransaction = {
    id: rng.uuid("MT") as Id,
    date: `${world.year}-W${world.week || 1}`,
    myosekiId,
    type: "lease",
    fromId: stock.ownerId,
    toId: lesseeId,
    amount: annualLeaseFee,
  };

  const updatedStocks = {
    ...market.stocks,
    [myosekiId]: {
      ...stock,
      holderId: lesseeId,
      status: "leased" as const,
      leaseFee: annualLeaseFee,
    },
  };

  builder.updateWorldField("myosekiMarket", {
    ...market,
    stocks: updatedStocks,
    history: [tx, ...market.history],
  });

  return builder.build();
}

/**
 * Return a leased myoseki stock — holderId reverts to ownerId.
 */
export function returnLeasedMyoseki(
  world: WorldState,
  market: MyosekiMarket,
  myosekiId: Id
): StateImpact {
  const builder = createImpactBuilder("returnLeasedMyoseki");
  const stock = market.stocks[myosekiId];

  if (!stock || stock.status !== "leased") {
    return builder.build();
  }

  const rng = rngForWorld(world, "myoseki", `return-${myosekiId}`);
  const tx: MyosekiTransaction = {
    id: rng.uuid("MT") as Id,
    date: `${world.year}-W${world.week || 1}`,
    myosekiId,
    type: "return",
    fromId: stock.holderId,
    toId: stock.ownerId,
    amount: 0,
  };

  const updatedStocks = {
    ...market.stocks,
    [myosekiId]: {
      ...stock,
      holderId: stock.ownerId,
      status: "held" as const,
      leaseFee: undefined,
    },
  };

  builder.updateWorldField("myosekiMarket", {
    ...market,
    stocks: updatedStocks,
    history: [tx, ...market.history],
  });

  return builder.build();
}

/**
 * Find an available stock in the market.
 * Used by retireeOyakataConversion to check if merit issuance is needed.
 */
export function findAvailableStock(market: MyosekiMarket): MyosekiStock | undefined {
  return Object.values(market.stocks).find((s) => s.status === "available");
}
