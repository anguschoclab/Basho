import { rngFromSeed, rngForWorld } from "./rng";
import type { WorldState } from "./types/world";
import type { Id, IdMapRuntime } from "./types/common";
import type { MyosekiStock, MyosekiMarket, MyosekiTransaction, MyosekiStatus } from "./types/myoseki";
import type { Oyakata } from "./types/oyakata";
import { EventBus } from "./events";
import { stableSort } from "./utils/sort";

const TOTAL_MYOSEKI = 105;
const BASE_ASKING_PRICE = 150_000_000;
const MAX_ASKING_PRICE = 350_000_000;
const LEASE_RATE_PERCENT = 0.05; // 5% of asking price per year, divided weekly/monthly

// Generated names for Myoseki (authentic-sounding or actual names)
const MYOSEKI_NAMES = [
  "Tateyama", "Nishonoseki", "Kokonoe", "Takasago", "Dewanoumi",
  "Tokitsukaze", "Isegahama", "Kasugano", "Tatsunami", "Sakaigawa",
  "Sadogatake", "Musashigawa", "Oitekaze", "Miyagino", "Hakkaku",
  "Oguruma", "Michinoku", "Isenoumi", "Takadagawa", "Shikoroyama",
  "Tagonoura", "Otake", "Tomozuna", "Kise", "Futagoyama",
  "Asahiyama", "Arashio", "Oshiogawa", "Takekuma", "Chiganoura",
  "Hanakago", "Kagamiyama", "Kataonami", "Magaki", "Minato",
  "Minezaki", "Naruto", "Nishikido", "Onogawa", "Onomatsu",
  "Shikihide", "Tamanoi", "Tatsutagawa", "Azumazeki", "Irumagawa",
  "Kiriyama", "Asakayama", "Shiranui", "Otowayama", "Urakaze",
  "Ikazuchi", "Jinmaku", "Oshiogawa", "Tatsunami", "Minato",
  "Tatsunami", "Kumagatani", "Irumagawa", "Tatsutagawa", "Edagawa",
  "Kise", "Kasugayama", "Tatsutayama", "Tatsutayama", "Minato",
  "Fujishima", "Katsunoura", "Oyamazumi", "Hanakago", "Shiratama",
  "Onomatsu", "Asahiyama", "Tatsutayama", "Izutsu", "Asakayama",
  "Irumagawa", "Kumagatani", "Kumagatani", "Edagawa", "Minatogawa",
  "Sanoyama", "Tatsutayama", "Minatogawa", "Kumagatani", "Izutsu",
  "Kumagatani", "Tatsutayama", "Shikoroyama", "Kise", "Onogawa",
  "Kumagatani", "Izutsu", "Onogawa", "Shikoroyama", "Kise",
  "Izutsu", "Onogawa", "Kumagatani", "Edagawa", "Kise",
  "Shikoroyama", "Izutsu", "Onogawa", "Kumagatani", "Minatogawa"
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
export function generateMyosekiMarket(seed: string, oyakataMap: IdMapRuntime<Oyakata>): MyosekiMarket {
  const rng = rngFromSeed(seed, "myoseki", "init");
  const stocks: Record<Id, MyosekiStock> = {};

  const availableNames = [...uniqueNames].slice(0, TOTAL_MYOSEKI);

  let i = 0;
  // First pass: Assign to every active Oyakata
  for (const oyakata of stableSort(Array.from(oyakataMap.values()), x => (x as any).id || String(x))) {
    if (i >= TOTAL_MYOSEKI) break;

    const name = availableNames[i];
    const prestigeTier = rng.next() > 0.8 ? "elite" : rng.next() > 0.4 ? "respected" : "modest";

    stocks[`myo_${i}`] = {
      id: `myo_${i}`,
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

    const basePrice = prestigeTier === "elite" ? 250_000_000 : prestigeTier === "respected" ? 200_000_000 : 150_000_000;
    const askingPrice = basePrice + Math.floor(rng.next() * 50_000_000);

    stocks[`myo_${i}`] = {
      id: `myo_${i}`,
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
    history: []
  };
}

/**
 * Weekly tick for Myoseki Market
 * Handles lease payments and market fluctuations
 */
export function tickMyosekiMarket(world: WorldState): void {
  if (!world.myosekiMarket) return;

  const market = world.myosekiMarket;
  const rng = rngForWorld(world, "myoseki", `tick_${world.year}_${world.week}`);

  // Only run major logic during specific phases to save CPU? No, run weekly.
  // Build map of oyakataId to heya for faster lookup
  const oyakataHeyaMap = new Map();
  for (const h of stableSort(Array.from(world.heyas.values()), x => (x as any).id || String(x))) {
    if (h.oyakataId) oyakataHeyaMap.set(h.oyakataId, h);
  }

  for (const stock of Object.values(market.stocks)) {
    // 1. Pay lease fees (if leased)
    if (stock.status === "leased" && stock.leaseFee) {
      const weeklyFee = Math.floor(stock.leaseFee / 52); // Approx weekly

      // Try to deduct from lessee's heya
      if (stock.holderId.startsWith("oyakata_")) {
        // Find heya owned by this oyakata
        const lesseeHeya = oyakataHeyaMap.get(stock.holderId);
        if (lesseeHeya) {
          lesseeHeya.funds -= weeklyFee;
          // If the owner is a different heya, they would get paid, but typically it's an NPC/Retired
        }
      }
    }

    // 2. Randomly fluctuate available asking prices
    if (stock.status === "available" && rng.next() < 0.1) {
      const adjustment = (rng.next() * 20_000_000) - 10_000_000;
      stock.askingPrice = Math.max(BASE_ASKING_PRICE, Math.min(MAX_ASKING_PRICE, (stock.askingPrice || BASE_ASKING_PRICE) + adjustment));
    }
  }
}

function logMyosekiTransaction(
  world: WorldState,
  myosekiId: string,
  type: "sale" | "lease" | "return",
  fromId: string,
  toId: string,
  amount: number
) {
  world.myosekiMarket!.history.unshift({
    id: `tx_${world.year}_${world.week}_${myosekiId}_${type}`, // Replaced Date.now() for determinism
    date: `${world.year}-W${world.week}`,
    myosekiId,
    type,
    fromId,
    toId,
    amount
  });
}

/**
 * Buy a Myoseki stock.
 */
export function buyMyoseki(world: WorldState, buyerId: Id, buyerHeyaId: Id, myosekiId: Id): boolean {
  if (!world.myosekiMarket) return false;

  const stock = world.myosekiMarket.stocks[myosekiId];
  if (!stock || stock.status !== "available" || !stock.askingPrice) return false;

  const heya = world.heyas.get(buyerHeyaId);
  if (!heya || heya.funds < stock.askingPrice) return false;

  // Deduct funds
  heya.funds -= stock.askingPrice;

  // Transfer ownership
  stock.ownerId = buyerId;
  stock.holderId = buyerId;
  stock.status = "held";

  // Log transaction
  const amount = stock.askingPrice;
  delete stock.askingPrice;

  logMyosekiTransaction(world, myosekiId, "sale", "JSA", buyerId, amount);

  EventBus.financialAlert(world, heya.id, "Myoseki Acquired", `${heya.name} acquired the ${stock.name} elder stock for ¥${amount.toLocaleString()}.`);

  return true;
}

/**
 * Lease a Myoseki stock.
 */
export function leaseMyoseki(world: WorldState, lesseeId: Id, myosekiId: Id): boolean {
  if (!world.myosekiMarket) return false;

  const stock = world.myosekiMarket.stocks[myosekiId];
  if (!stock || stock.status !== "available" || !stock.askingPrice) return false;

  // Transfer lease
  stock.holderId = lesseeId;
  stock.status = "leased";
  stock.leaseFee = Math.floor(stock.askingPrice * LEASE_RATE_PERCENT);

  logMyosekiTransaction(world, myosekiId, "lease", stock.ownerId, lesseeId, stock.leaseFee);

  return true;
}
