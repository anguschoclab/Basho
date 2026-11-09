/**
 * Myoseki Active Trading Service
 *
 * Extends the existing myoseki market with active oyakata-to-oyakata
 * sale and lease transactions, a fixed pool of ~105 elder names,
 * and price negotiation based on prestige tier.
 */

import type { Id } from "@/engine/types/common";
import type { MyosekiMarket, MyosekiStock, MyosekiTransaction } from "@/engine/types/myoseki";
import type { WorldState } from "@/engine/types/world";
import type { StateImpact } from "@/engine/core/StateImpact";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import { getHeya } from "@/engine/core/queries";
import { rngForWorld } from "@/engine/core/rng";

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

  // Self-purchase is a no-op — parity with buyMyoseki (myosekiMarket.ts).
  // Without the guard the buyer debit lands while the seller credit is
  // suppressed for same-heya trades, destroying the price outright.
  if (stock.ownerId === buyerId) {
    return builder.build();
  }

  const price = stock.askingPrice ?? MYOSEKI_BASE_PRICES[stock.prestigeTier];
  if (buyerFunds < price) {
    return builder.build();
  }

  // Transaction label carries type/participants/time/amount — the bare
  // `purchase-${id}` label minted identical MT-* ids on repeat sales.
  const rng = rngForWorld(
    world,
    "myoseki",
    `tx_${myosekiId}_sale_${stock.ownerId}_${buyerId}_${world.year ?? 0}_${world.week ?? 0}_${price}`
  );
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

  // Debit the buyer's heya — buyerId is an oyakata id, so resolve its heya;
  // fall back to treating buyerId as a heya id for callers that pass one.
  const buyerHeyaId = world.oyakata?.get(buyerId)?.heyaId ?? buyerId;
  builder.updateHeya(buyerHeyaId, { funds: buyerFunds - price });

  // Credit the seller's heya — stock.ownerId is an oyakata id (or "JSA"), so
  // resolve the owning heya the same way. JSA-owned stock pays no heya.
  const sellerHeyaId = world.oyakata?.get(stock.ownerId)?.heyaId ?? stock.ownerId;
  const seller = sellerHeyaId !== "JSA" ? getHeya(world, sellerHeyaId) : undefined;
  if (seller && seller.id !== buyerHeyaId) {
    builder.updateHeya(seller.id, { funds: seller.funds + price });
  }

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

  // Same tx-label richness as purchases — a second return on the same stock
  // must mint a distinct MT-* id.
  const rng = rngForWorld(
    world,
    "myoseki",
    `tx_${myosekiId}_return_${stock.holderId}_${stock.ownerId}_${world.year ?? 0}_${world.week ?? 0}_0`
  );
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
