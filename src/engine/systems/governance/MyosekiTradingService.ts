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

/** Canonical fixed pool of ~105 myoseki (elder name) stocks. */
export const CANONICAL_MYOSEKI_NAMES: Array<{
  name: string;
  prestigeTier: "elite" | "respected" | "modest";
}> = [
  // Elite tier (yokozuna/ozeki names)
  { name: "Dewanoumi", prestigeTier: "elite" },
  { name: "Futagoyama", prestigeTier: "elite" },
  { name: "Takanohana", prestigeTier: "elite" },
  { name: "Wakanohana", prestigeTier: "elite" },
  { name: "Taiho", prestigeTier: "elite" },
  { name: "Kitanoumi", prestigeTier: "elite" },
  { name: "Chiyonofuji", prestigeTier: "elite" },
  { name: "Akebono", prestigeTier: "elite" },
  { name: "Musashigawa", prestigeTier: "elite" },
  { name: "Musashimaru", prestigeTier: "elite" },
  // Respected tier
  { name: "Kasugano", prestigeTier: "respected" },
  { name: "Sadogatake", prestigeTier: "respected" },
  { name: "Nishonoseki", prestigeTier: "respected" },
  { name: "Tokitsukaze", prestigeTier: "respected" },
  { name: "Isegahama", prestigeTier: "respected" },
  { name: "Oshima", prestigeTier: "respected" },
  { name: "Kokonoe", prestigeTier: "respected" },
  { name: "Miyagino", prestigeTier: "respected" },
  { name: "Tatsunami", prestigeTier: "respected" },
  { name: "Ajigawa", prestigeTier: "respected" },
  { name: "Takadagawa", prestigeTier: "respected" },
  { name: "Naruto", prestigeTier: "respected" },
  { name: "Tamanoi", prestigeTier: "respected" },
  { name: "Kise", prestigeTier: "respected" },
  { name: "Hakkaku", prestigeTier: "respected" },
  // Modest tier (filling out to ~105)
  { name: "Arashio", prestigeTier: "modest" },
  { name: "Asahiyama", prestigeTier: "modest" },
  { name: "Azumazeki", prestigeTier: "modest" },
  { name: "Chiganoura", prestigeTier: "modest" },
  { name: "Daijo", prestigeTier: "modest" },
  { name: "Edonishiki", prestigeTier: "modest" },
  { name: "Hanaregoma", prestigeTier: "modest" },
  { name: "Hidenoyama", prestigeTier: "modest" },
  { name: "Higashiishikawa", prestigeTier: "modest" },
  { name: "Ikazuchi", prestigeTier: "modest" },
  { name: "Irumagawa", prestigeTier: "modest" },
  { name: "Izutsu", prestigeTier: "modest" },
  { name: "Kabutoyama", prestigeTier: "modest" },
  { name: "Kagamiyama", prestigeTier: "modest" },
  { name: "Kataonami", prestigeTier: "modest" },
  { name: "Kiriyama", prestigeTier: "modest" },
  { name: "Kiyosegawa", prestigeTier: "modest" },
  { name: "Magaki", prestigeTier: "modest" },
  { name: "Matsugane", prestigeTier: "modest" },
  { name: "Michinori", prestigeTier: "modest" },
  { name: "Midorikawa", prestigeTier: "modest" },
  { name: "Minato", prestigeTier: "modest" },
  { name: "Nakamura", prestigeTier: "modest" },
  { name: "Nakadachi", prestigeTier: "modest" },
  { name: "Nishiiidzuka", prestigeTier: "modest" },
  { name: "Nishikido", prestigeTier: "modest" },
  { name: "Nishonoseki", prestigeTier: "modest" },
  { name: "Oguruma", prestigeTier: "modest" },
  { name: "Onaruto", prestigeTier: "modest" },
  { name: "Onoe", prestigeTier: "modest" },
  { name: "Onomatsu", prestigeTier: "modest" },
  { name: "Otake", prestigeTier: "modest" },
  { name: "Oyama", prestigeTier: "modest" },
  { name: "Sakaigawa", prestigeTier: "modest" },
  { name: "Sanoyama", prestigeTier: "modest" },
  { name: "Shibatayama", prestigeTier: "modest" },
  { name: "Shikihide", prestigeTier: "modest" },
  { name: "Shinsekigawa", prestigeTier: "modest" },
  { name: "Shikoroyama", prestigeTier: "modest" },
  { name: "Sumidagawa", prestigeTier: "modest" },
  { name: "Tagonoura", prestigeTier: "modest" },
  { name: "Takahashi", prestigeTier: "modest" },
  { name: "Takanishi", prestigeTier: "modest" },
  { name: "Takekuma", prestigeTier: "modest" },
  { name: "Tatsurayama", prestigeTier: "modest" },
  { name: "Tomoegata", prestigeTier: "modest" },
  { name: "Tokiwayama", prestigeTier: "modest" },
  { name: "Tsuchiyama", prestigeTier: "modest" },
  { name: "Urakaze", prestigeTier: "modest" },
  { name: "Wadagawa", prestigeTier: "modest" },
  { name: "Yamahibiki", prestigeTier: "modest" },
  { name: "Yamazaki", prestigeTier: "modest" },
  { name: "Yokozuna", prestigeTier: "modest" },
  { name: "Yorikiri", prestigeTier: "modest" },
  { name: "Yotsukasa", prestigeTier: "modest" },
  { name: "Wakamatsu", prestigeTier: "modest" },
  { name: "Zennosho", prestigeTier: "modest" },
  { name: "Katsunada", prestigeTier: "modest" },
  { name: "Kumegawa", prestigeTier: "modest" },
  { name: "Michiyama", prestigeTier: "modest" },
  { name: "Muranishiki", prestigeTier: "modest" },
  { name: "Nakazato", prestigeTier: "modest" },
  { name: "Nishiochiai", prestigeTier: "modest" },
  { name: "Oikari", prestigeTier: "modest" },
  { name: "Oshima", prestigeTier: "modest" },
  { name: "Shibatayama", prestigeTier: "modest" },
  { name: "Shinonome", prestigeTier: "modest" },
  { name: "Tachiyagawa", prestigeTier: "modest" },
  { name: "Tatsutayama", prestigeTier: "modest" },
  { name: "Tatsutomi", prestigeTier: "modest" },
  { name: "Tominohana", prestigeTier: "modest" },
  { name: "Tomozuna", prestigeTier: "modest" },
  { name: "Toyonomiyagawa", prestigeTier: "modest" },
  { name: "Tsukiyama", prestigeTier: "modest" },
  { name: "Ushio", prestigeTier: "modest" },
  { name: "Yamate", prestigeTier: "modest" },
  { name: "Yamato", prestigeTier: "modest" },
  { name: "Yamatsuru", prestigeTier: "modest" },
  { name: "Yokozuna", prestigeTier: "modest" },
  { name: "Yorozuyama", prestigeTier: "modest" },
  { name: "Yotsuharai", prestigeTier: "modest" },
  { name: "Wakafuji", prestigeTier: "modest" },
  { name: "Wakamatsu", prestigeTier: "modest" },
  { name: "Zensho", prestigeTier: "modest" },
  { name: "Zenshoya", prestigeTier: "modest" },
  { name: "Zenshuyama", prestigeTier: "modest" },
];

/** Base asking prices by prestige tier (in yen). */
export const MYOSEKI_BASE_PRICES: Record<MyosekiStock["prestigeTier"], number> = {
  elite: 500_000_000,
  respected: 200_000_000,
  modest: 80_000_000,
};

/**
 * Initialize the myoseki market with a fixed pool of ~105 names.
 * All stocks start as "available" owned by "JSA".
 */
export function initializeMyosekiMarket(_world: WorldState): MyosekiMarket {
  const stocks: Record<Id, MyosekiStock> = {};

  for (let i = 0; i < CANONICAL_MYOSEKI_NAMES.length; i++) {
    const entry = CANONICAL_MYOSEKI_NAMES[i];
    const id = `myoseki-${i}` as Id;
    stocks[id] = {
      id,
      name: entry.name,
      prestigeTier: entry.prestigeTier,
      ownerId: "JSA",
      holderId: "JSA",
      status: "available",
      askingPrice: MYOSEKI_BASE_PRICES[entry.prestigeTier],
    };
  }

  return { stocks, history: [] };
}

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

  if (!stock || stock.status === "available") {
    return builder.build();
  }

  const updatedStocks = {
    ...market.stocks,
    [myosekiId]: { ...stock, askingPrice },
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

  return builder.build();
}

/**
 * Lease a myoseki stock — transfers holderId without transferring ownerId.
 */
export function leaseMyoseki(
  world: WorldState,
  market: MyosekiMarket,
  myosekiId: Id,
  lesseeId: Id,
  annualLeaseFee: number
): StateImpact {
  const builder = createImpactBuilder("leaseMyoseki");
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
