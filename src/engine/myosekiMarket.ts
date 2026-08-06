import { rngFromSeed, rngForWorld } from "./rng";
import type { WorldState } from "./types/world";
import type { Id, IdMapRuntime } from "./types/common";
import type { MyosekiStock, MyosekiMarket, MyosekiTransaction } from "./types/myoseki";
import type { Oyakata } from "./types/oyakata";
import { createImpactBuilder } from "./core/ImpactBuilder";
import type { StateImpact } from "./core/StateImpact";
import { stableSort } from "./utils/sort";
import { isMyosekiPlayerRelevant } from "./npcAI/eventSurfacing";
import { getHeya } from "./queries";
import type { Heya } from "./types/heya";

const TOTAL_MYOSEKI = 105;
const BASE_ASKING_PRICE = 150_000_000;
const MAX_ASKING_PRICE = 350_000_000;
const LEASE_RATE_PERCENT = 0.05; // 5% of asking price per year, divided weekly/monthly

// Generated names for Myoseki (authentic-sounding or actual names)
const MYOSEKI_NAMES = [
  "Tateyama",
  "Nishonoseki",
  "Kokonoe",
  "Takasago",
  "Dewanoumi",
  "Tokitsukaze",
  "Isegahama",
  "Kasugano",
  "Tatsunami",
  "Sakaigawa",
  "Sadogatake",
  "Musashigawa",
  "Oitekaze",
  "Miyagino",
  "Hakkaku",
  "Oguruma",
  "Michinoku",
  "Isenoumi",
  "Takadagawa",
  "Shikoroyama",
  "Tagonoura",
  "Otake",
  "Tomozuna",
  "Kise",
  "Futagoyama",
  "Asahiyama",
  "Arashio",
  "Oshiogawa",
  "Takekuma",
  "Chiganoura",
  "Hanakago",
  "Kagamiyama",
  "Kataonami",
  "Magaki",
  "Minato",
  "Minezaki",
  "Naruto",
  "Nishikido",
  "Onogawa",
  "Onomatsu",
  "Shikihide",
  "Tamanoi",
  "Tatsutagawa",
  "Azumazeki",
  "Irumagawa",
  "Kiriyama",
  "Asakayama",
  "Shiranui",
  "Otowayama",
  "Urakaze",
  "Ikazuchi",
  "Jinmaku",
  "Oshiogawa",
  "Tatsunami",
  "Minato",
  "Tatsunami",
  "Kumagatani",
  "Irumagawa",
  "Tatsutagawa",
  "Edagawa",
  "Kise",
  "Kasugayama",
  "Tatsutayama",
  "Tatsutayama",
  "Minato",
  "Fujishima",
  "Katsunoura",
  "Oyamazumi",
  "Hanakago",
  "Shiratama",
  "Onomatsu",
  "Asahiyama",
  "Tatsutayama",
  "Izutsu",
  "Asakayama",
  "Irumagawa",
  "Kumagatani",
  "Kumagatani",
  "Edagawa",
  "Minatogawa",
  "Sanoyama",
  "Tatsutayama",
  "Minatogawa",
  "Kumagatani",
  "Izutsu",
  "Kumagatani",
  "Tatsutayama",
  "Shikoroyama",
  "Kise",
  "Onogawa",
  "Kumagatani",
  "Izutsu",
  "Onogawa",
  "Shikoroyama",
  "Kise",
  "Izutsu",
  "Onogawa",
  "Kumagatani",
  "Edagawa",
  "Kise",
  "Shikoroyama",
  "Izutsu",
  "Onogawa",
  "Kumagatani",
  "Minatogawa",
];

// Dedupe and pad just in case
const uniqueNames = Array.from(new Set(MYOSEKI_NAMES));
while (uniqueNames.length < TOTAL_MYOSEKI) {
  uniqueNames.push(`Elder_${uniqueNames.length + 1}`);
}

/**
 * Generate the initial Myoseki Market.
 * Ensures exactly 105 exist. Assigns them to existing active oyakata first.
 * The rest are held by JSA or retired individuals and marked available.
 */
export function generateMyosekiMarket(
  seed: string,
  oyakataMap: IdMapRuntime<Oyakata>
): MyosekiMarket {
  const rng = rngFromSeed(seed, "myoseki", "init");
  const stocks: Record<Id, MyosekiStock> = {};

  const availableNames = [...uniqueNames].slice(0, TOTAL_MYOSEKI);

  let i = 0;
  // First pass: Assign to every active Oyakata
  for (const oyakata of stableSort(oyakataMap.values(), (x) => x.id)) {
    if (i >= TOTAL_MYOSEKI) break;

    const name = availableNames[i];
    const prestigeTier = rng.next() > 0.8 ? "elite" : rng.next() > 0.4 ? "respected" : "modest";
    const id = rng.uuid("MS");

    stocks[id] = {
      id,
      name,
      prestigeTier,
      ownerId: oyakata.id,
      holderId: oyakata.id,
      status: "held",
    };
    i++;
  }

  // Second pass: Remaining stocks are on the market (held by JSA or "retired" npc)
  for (; i < TOTAL_MYOSEKI; i++) {
    const name = availableNames[i];
    const prestigeTier = rng.next() > 0.8 ? "elite" : rng.next() > 0.4 ? "respected" : "modest";

    const basePrice =
      prestigeTier === "elite"
        ? 250_000_000
        : prestigeTier === "respected"
          ? 200_000_000
          : 150_000_000;
    const askingPrice = basePrice + Math.floor(rng.next() * 50_000_000);
    const id = rng.uuid("MS");

    stocks[id] = {
      id,
      name,
      prestigeTier,
      ownerId: "JSA",
      holderId: "JSA",
      status: "available",
      askingPrice,
    };
  }

  return {
    stocks,
    history: [],
  };
}

/**
 * Weekly tick for Myoseki Market
 * Handles lease payments and market fluctuations
 * Returns StateImpact describing market updates instead of mutating directly.
 */
export function tickMyosekiMarket(world: WorldState): StateImpact {
  const builder = createImpactBuilder("tickMyosekiMarket");
  if (!world.myosekiMarket) return builder.build();

  const market = world.myosekiMarket;
  const rng = rngForWorld(world, "myoseki", "tick");

  // Only run major logic during specific phases to save CPU? No, run weekly.
  // Build map of oyakataId to heya for faster lookup
  const oyakataHeyaMap = new Map();
  for (const h of stableSort(world.heyas.values(), (x) => x.id)) {
    if (h.oyakataId) oyakataHeyaMap.set(h.oyakataId, h);
  }

  const updatedStocks = { ...market.stocks };
  const heyaUpdates: Record<Id, Partial<Heya>> = {};

  for (const stock of stableSort(Object.values(market.stocks), (x) => x.id)) {
    const updatedStock = { ...stock };

    // 1. Pay lease fees (if leased)
    if (stock.status === "leased" && stock.leaseFee) {
      const weeklyFee = Math.floor(stock.leaseFee / 52); // Approx weekly

      // Try to deduct from lessee's heya
      if (stock.holderId.startsWith("oyakata_")) {
        // Find heya owned by this oyakata
        const lesseeHeya = oyakataHeyaMap.get(stock.holderId);
        if (lesseeHeya) {
          if (!heyaUpdates[lesseeHeya.id]) {
            heyaUpdates[lesseeHeya.id] = { funds: lesseeHeya.funds - weeklyFee };
          } else {
            heyaUpdates[lesseeHeya.id].funds -= weeklyFee;
          }
        }
      }
    }

    // 2. Randomly fluctuate available asking prices
    if (stock.status === "available" && rng.next() < 0.1) {
      const adjustment = rng.next() * 20_000_000 - 10_000_000;
      updatedStock.askingPrice = Math.max(
        BASE_ASKING_PRICE,
        Math.min(MAX_ASKING_PRICE, (stock.askingPrice || BASE_ASKING_PRICE) + adjustment)
      );
    }

    updatedStocks[stock.id] = updatedStock;
  }

  // Apply heya updates
  for (const heyaId in heyaUpdates) {
    if (!Object.prototype.hasOwnProperty.call(heyaUpdates, heyaId)) continue;
    const update = heyaUpdates[heyaId];
    builder.updateHeya(heyaId, update);
  }

  builder.updateWorldField("myosekiMarket", { ...market, stocks: updatedStocks });

  return builder.build();
}

function getAvailableStock(world: WorldState, myosekiId: Id): MyosekiStock | null {
  if (!world.myosekiMarket) return null;
  const stock = world.myosekiMarket.stocks[myosekiId];
  if (!stock || stock.status !== "available" || !stock.askingPrice) return null;
  return stock;
}

function getMyosekiTransaction(
  world: WorldState,
  myosekiId: string,
  type: "sale" | "lease" | "return",
  fromId: string,
  toId: string,
  amount: number
): MyosekiTransaction {
  const rng = rngForWorld(world, "market", "tx");
  return {
    id: rng.uuid("MT"),
    date: `${world.year}-W${world.week}`,
    myosekiId,
    type,
    fromId,
    toId,
    amount,
  };
}

/**
 * Buy a Myoseki stock.
 * Returns StateImpact describing myoseki purchase instead of mutating directly.
 */
export function buyMyoseki(
  world: WorldState,
  buyerId: Id,
  buyerHeyaId: Id,
  myosekiId: Id
): StateImpact {
  const builder = createImpactBuilder("buyMyoseki");
  const stock = getAvailableStock(world, myosekiId);
  if (!stock || !stock.askingPrice) return builder.build();

  const heya = getHeya(world, buyerHeyaId);
  if (!heya || heya.funds < stock.askingPrice) return builder.build();

  const newFunds = heya.funds - stock.askingPrice;
  const amount = stock.askingPrice;

  builder.updateHeya(buyerHeyaId, { funds: newFunds });

  const importance = isMyosekiPlayerRelevant(world, stock);

  builder.logEvent(
    "FINANCIAL_ALERT",
    "economy",
    {
      heyaname: heya.name,
      incident: "myoseki_acquisition",
      money: amount,
      status: stock.name,
    },
    { heyaId: buyerHeyaId, importance }
  );

  builder.updateMyosekiStock(myosekiId, {
    ownerId: buyerId,
    holderId: buyerId,
    status: "held" as const,
    askingPrice: undefined,
  });

  builder.recordMyosekiTransaction(
    getMyosekiTransaction(world, myosekiId, "sale", "JSA", buyerId, amount)
  );

  return builder.build();
}

/**
 * Lease a Myoseki stock.
 * Returns StateImpact describing myoseki lease instead of mutating directly.
 */
export function leaseMyoseki(world: WorldState, lesseeId: Id, myosekiId: Id): StateImpact {
  const builder = createImpactBuilder("leaseMyoseki");
  const stock = getAvailableStock(world, myosekiId);
  if (!stock || !stock.askingPrice) return builder.build();

  const leaseFee = Math.floor(stock.askingPrice * LEASE_RATE_PERCENT);

  builder.updateMyosekiStock(myosekiId, {
    holderId: lesseeId,
    status: "leased" as const,
    leaseFee,
  });

  const importance = isMyosekiPlayerRelevant(world, stock);

  builder.logEvent(
    "FINANCIAL_ALERT",
    "economy",
    {
      incident: "myoseki_lease",
      money: leaseFee,
      status: stock.name,
      lesseeId,
    },
    { importance }
  );

  builder.recordMyosekiTransaction(
    getMyosekiTransaction(world, myosekiId, "lease", stock.ownerId, lesseeId, leaseFee)
  );

  return builder.build();
}
