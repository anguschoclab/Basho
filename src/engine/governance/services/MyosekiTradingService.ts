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
import { rngForWorld } from "@/engine/core/rng";

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
