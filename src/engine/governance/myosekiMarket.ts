import { rngFromSeed, rngForWorld } from "@/engine/core/rng";
import type { WorldState } from "@/engine/types/world";
import type { Id, IdMapRuntime } from "@/engine/types/common";
import type { MyosekiStock, MyosekiMarket, MyosekiTransaction } from "@/engine/types/myoseki";
import type { Oyakata } from "@/engine/types/oyakata";
import type { Rikishi } from "@/engine/types/rikishi";
import type { IchimonName } from "@/engine/types/economy";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import type { StateImpact } from "@/engine/core/StateImpact";
import { stableSort } from "@/engine/utils/sort";
import { isMyosekiPlayerRelevant } from "@/engine/npc/eventSurfacing";
import { getHeya } from "@/engine/core/queries";
import type { Heya } from "@/engine/types/heya";
import { isSekitoriDivision } from "@/constants/engine/rankDisplay";
import {
  KABU_HELD_DISTRIBUTION,
  KABU_ICHIMON_DISTRIBUTION,
  MYOSEKI_TOTAL_COUNT,
  MYOSEKI_BASE_ASKING_PRICE,
  MYOSEKI_MAX_ASKING_PRICE,
  MYOSEKI_LEASE_RATE_PERCENT,
  MYOSEKI_PRICE_JITTER,
  MYOSEKI_PRICE_ADJUSTMENT_RANGE,
  MYOSEKI_GENERATION_BASE_PRICES,
} from "@/constants/engine/economic";

// Constants imported from constants/engine/economic.ts

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
  "Ajigawa",
  "Araiso",
  "Asahiyama",
  "Asakayama",
  "Dekiyama",
  "Fujigane",
  "Fujishima",
  "Furiwake",
  "Hanakago",
  "Hanaregoma",
  "Hidenoyama",
  "Ikazuchi",
  "Inagawa",
  "Iwatomo",
  "Kagamiyama",
  "Kasugayama",
  "Kataonami",
  "Kimigahama",
  "Kiriyama",
  "Kitajin",
  "Kiyomigata",
  "Kumegawa",
  "Magaki",
  "Minezaki",
  "Minato",
  "Miyahama",
  "Nakadachi",
  "Nakagawa",
  "Nakamura",
  "Naruto",
  "Nishiiwa",
  "Nishikijima",
  "Nishikido",
  "Oshima",
  "Oshiogawa",
  "Onoe",
  "Otowayama",
  "Sanoyama",
  "Sekinoto",
  "Shibatayama",
  "Shikihide",
  "Shiratama",
  "Takasaki",
  "Takenawa",
  "Tamagaki",
  "Tanigawa",
  "Tatekawa",
  "Tagonoura",
  "Tatsutagawa",
  "Terasawa",
  "Tokiwayama",
  "Tomozuna",
  "Urakaze",
  "Wakamatsu",
  "Yamahibiki",
  "Yamashina",
  "Yotsukasa",
  "Ajigane",
  "Azumazeki",
  "Chiganoura",
  "Fujinosawa",
  "Hatachiyama",
  "Hiramatsu",
  "Ikematsu",
  "Irumagawa",
  "Jinmaku",
  "Kise",
  "Wakafuji",
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
while (uniqueNames.length < MYOSEKI_TOTAL_COUNT) {
  uniqueNames.push(`Elder_${uniqueNames.length + 1}`);
}

/** Rank precedence for reserve-share seating — senior sekitori first. */
const RESERVE_RANK_ORDER: Record<string, number> = {
  yokozuna: 0,
  ozeki: 1,
  sekiwake: 2,
  komusubi: 3,
  maegashira: 4,
  juryo: 5,
};

/**
 * Generate the initial Myoseki Market.
 * Ensures exactly 105 exist, clan-tagged at the real JSA distribution
 * (~35/29/16/11/11). Held shares seat stablemasters first, then reserve
 * shares on active sekitori (a top-division rikishi holds the kabu earmarked
 * for his own elder life — converted to his oyakata name on intai, or
 * released to the pool if he never qualifies). The remainder stays
 * JSA-available on the market, clan tags intact.
 */
export function generateMyosekiMarket(
  seed: string,
  oyakataMap: IdMapRuntime<Oyakata>,
  heyaMap?: IdMapRuntime<Heya>,
  rikishiMap?: IdMapRuntime<Rikishi>
): MyosekiMarket {
  const rng = rngFromSeed(seed, "myoseki", "init");
  const stocks: Record<Id, MyosekiStock> = {};

  const availableNames = [...uniqueNames].slice(0, MYOSEKI_TOTAL_COUNT);
  // WS-6 — a share's ichimon lineage follows the holder's stable clan.
  const clanOfHeya = (heyaId: string | undefined): IchimonName | undefined =>
    heyaId ? heyaMap?.get(heyaId)?.ichimon : undefined;
  const ichimonOf = (oyakata: Oyakata) => clanOfHeya(oyakata.heyaId);

  const heldByClan = new Map<IchimonName, number>();
  const mint = (name: string): MyosekiStock => ({
    id: rng.uuid("MS"),
    name,
    prestigeTier: rng.next() > 0.8 ? "elite" : rng.next() > 0.4 ? "respected" : "modest",
    ownerId: "JSA",
    holderId: "JSA",
    status: "available",
  });
  const hold = (stock: MyosekiStock, holderId: Id, ichimon?: IchimonName): void => {
    stock.ownerId = holderId;
    stock.holderId = holderId;
    stock.status = "held";
    stock.askingPrice = undefined;
    if (ichimon) {
      stock.ichimon = ichimon;
      heldByClan.set(ichimon, (heldByClan.get(ichimon) ?? 0) + 1);
    }
  };

  let i = 0;
  // Pass 1: one share per active oyakata, tagged to the stable's clan.
  for (const oyakata of stableSort(oyakataMap.values(), (x) => x.id)) {
    if (i >= MYOSEKI_TOTAL_COUNT) break;
    const stock = mint(availableNames[i++]);
    hold(stock, oyakata.id, ichimonOf(oyakata));
    stocks[stock.id] = stock;
  }

  // Pass 2: sekitori reserve shares — clan-capped so each clan's held total
  // tracks KABU_HELD_DISTRIBUTION. Seats senior sekitori first.
  if (rikishiMap) {
    const reserveSlots = new Map<IchimonName, number>(
      (Object.keys(KABU_HELD_DISTRIBUTION) as IchimonName[]).map((clan) => [
        clan,
        Math.max(0, KABU_HELD_DISTRIBUTION[clan] - (heldByClan.get(clan) ?? 0)),
      ])
    );
    const sekitori = stableSort(
      [...rikishiMap.values()].filter(
        (r) => !r.isRetired && isSekitoriDivision(r.division)
      ),
      (r) => `${RESERVE_RANK_ORDER[r.rank] ?? 9}-${r.rankNumber ?? 99}-${r.id}`
    );
    for (const r of sekitori) {
      if (i >= MYOSEKI_TOTAL_COUNT) break;
      const clan = clanOfHeya(r.heyaId);
      if (!clan || (reserveSlots.get(clan) ?? 0) <= 0) continue;
      const stock = mint(availableNames[i++]);
      hold(stock, r.id, clan);
      reserveSlots.set(clan, (reserveSlots.get(clan) ?? 0) - 1);
      stocks[stock.id] = stock;
    }
  }

  // Pass 3: JSA pool — remaining slots carry the rest of the full-105 clan
  // tags (table minus held); any surplus names go unattributed.
  const poolTags: IchimonName[] = [];
  for (const clan of Object.keys(KABU_ICHIMON_DISTRIBUTION) as IchimonName[]) {
    const remaining = KABU_ICHIMON_DISTRIBUTION[clan] - (heldByClan.get(clan) ?? 0);
    for (let k = 0; k < remaining; k++) poolTags.push(clan);
  }
  for (; i < MYOSEKI_TOTAL_COUNT; i++) {
    const stock = mint(availableNames[i]);
    const basePrice =
      MYOSEKI_GENERATION_BASE_PRICES[stock.prestigeTier] ?? MYOSEKI_BASE_ASKING_PRICE;
    stock.askingPrice = basePrice + Math.floor(rng.next() * MYOSEKI_PRICE_JITTER);
    const tag = poolTags.shift();
    if (tag) stock.ichimon = tag;
    stocks[stock.id] = stock;
  }

  return {
    stocks,
    history: [],
  };
}

/**
 * Returns every stock held or owned by an oyakata to the unclaimed JSA pool —
 * clears holder/owner, any asking price, and any lease so a reverted share
 * pays no phantom income. Used when an oyakata leaves headship for good
 * (stable merger, heirless closure).
 */
export function releaseElderStockToPool(world: WorldState, oyakataId: Id): StateImpact {
  const builder = createImpactBuilder("releaseElderStockToPool");
  const market = world.myosekiMarket;
  if (!market?.stocks) return builder.build();

  const nextStocks = { ...market.stocks };
  let changed = false;
  for (const [stockId, stock] of Object.entries(market.stocks)) {
    if (stock.holderId === oyakataId || stock.ownerId === oyakataId) {
      nextStocks[stockId] = {
        ...stock,
        holderId: "JSA",
        ownerId: "JSA",
        status: "available",
        askingPrice: undefined,
        leaseFee: undefined,
      };
      changed = true;
    }
  }
  if (changed) {
    builder.updateWorldField("myosekiMarket", {
      ...market,
      history: market.history ?? [],
      stocks: nextStocks,
    });
  }
  return builder.build();
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
  const rng = rngForWorld(world, "myoseki", `tick_${world.year ?? 0}_${world.week ?? 0}`);

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

    // 1. Pay lease fees (if leased) — lessee's heya pays, owner's heya receives.
    if (stock.status === "leased" && stock.leaseFee) {
      const weeklyFee = Math.floor(stock.leaseFee / 52); // Approx weekly

      // Resolve the lessee's heya through the oyakata namespace — holderId is
      // an oyakata id, not a heya id (id-prefix sniffing previously missed
      // every oyakata not named "oyakata_*").
      const lesseeHeyaId =
        world.oyakata?.get(stock.holderId)?.heyaId ?? oyakataHeyaMap.get(stock.holderId)?.id;
      const lesseeHeya = lesseeHeyaId ? world.heyas.get(lesseeHeyaId) : undefined;

      // Credit the listing owner's heya the same fee — lease income previously
      // vanished (debited from the lessee but never received).
      const ownerHeyaId =
        world.oyakata?.get(stock.ownerId)?.heyaId ?? oyakataHeyaMap.get(stock.ownerId)?.id;
      const ownerHeya = ownerHeyaId ? world.heyas.get(ownerHeyaId) : undefined;

      // Same-heya leases (legacy/self-deal states) skip BOTH sides — debiting
      // the lessee while suppressing the owner credit is a weekly drain out
      // of thin air; new self-leases are blocked at leaseMyoseki.
      const sameHeya = !!lesseeHeya && !!ownerHeya && lesseeHeya.id === ownerHeya.id;

      if (lesseeHeya && !sameHeya) {
        const existing = heyaUpdates[lesseeHeya.id];
        heyaUpdates[lesseeHeya.id] = { funds: (existing?.funds ?? lesseeHeya.funds) - weeklyFee };
      }

      if (ownerHeya && !sameHeya) {
        const existing = heyaUpdates[ownerHeya.id];
        heyaUpdates[ownerHeya.id] = { funds: (existing?.funds ?? ownerHeya.funds) + weeklyFee };
      }
    }

    // 2. Randomly fluctuate available asking prices
    if (stock.status === "available" && rng.next() < 0.1) {
      const adjustment =
        rng.next() * MYOSEKI_PRICE_ADJUSTMENT_RANGE - MYOSEKI_PRICE_ADJUSTMENT_RANGE / 2;
      updatedStock.askingPrice = Math.max(
        MYOSEKI_BASE_ASKING_PRICE,
        Math.min(
          MYOSEKI_MAX_ASKING_PRICE,
          (stock.askingPrice || MYOSEKI_BASE_ASKING_PRICE) + adjustment
        )
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
  const rng = rngForWorld(
    world,
    "market",
    `tx_${myosekiId}_${type}_${fromId}_${toId}_${world.year ?? 0}_${world.week ?? 0}_${amount}`
  );
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

/** Fallback purchase price by prestige tier when a listed stock carries no
 * asking price (¥). Adopted from the retired MyosekiTradingService impl —
 * deliberately distinct from MYOSEKI_GENERATION_BASE_PRICES (different
 * values, different purpose). */
const MYOSEKI_FALLBACK_PRICES: Record<MyosekiStock["prestigeTier"], number> = {
  elite: 500_000_000,
  respected: 200_000_000,
  modest: 80_000_000,
};

/**
 * Buy a Myoseki stock — the single canonical purchase path for the player
 * worker command, NPC execution/finance, and the weekly NPC myoseki sweep.
 * Returns StateImpact describing myoseki purchase instead of mutating directly.
 */
export function buyMyoseki(
  world: WorldState,
  buyerId: Id,
  buyerHeyaId: Id,
  myosekiId: Id
): StateImpact {
  const builder = createImpactBuilder("buyMyoseki");
  const stock = world.myosekiMarket?.stocks[myosekiId];
  if (!stock || stock.status !== "available") return builder.build();
  // An "available" stock without an asking price transacts at its tier base.
  const amount = stock.askingPrice ?? MYOSEKI_FALLBACK_PRICES[stock.prestigeTier];

  const heya = getHeya(world, buyerHeyaId);
  if (!heya || heya.funds < amount) return builder.build();
  // Self-purchase is a no-op — re-buying your own listing debited the heya and
  // shredded the stock's sale terms for nothing.
  if (stock.ownerId === buyerId) return builder.build();

  const newFunds = heya.funds - amount;

  builder.updateHeya(buyerHeyaId, { funds: newFunds });

  // Credit the listing owner's heya — the transaction previously recorded the
  // money as going to "JSA" even when a third party owned the stock, so sale
  // proceeds vanished.
  const ownerHeyaId =
    world.oyakata?.get(stock.ownerId)?.heyaId ??
    world.rikishi?.get(stock.ownerId)?.heyaId;
  const ownerHeya = ownerHeyaId ? getHeya(world, ownerHeyaId) : undefined;
  if (ownerHeya && ownerHeya.id !== buyerHeyaId) {
    builder.updateHeya(ownerHeya.id, { funds: ownerHeya.funds + amount });
  }

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
    getMyosekiTransaction(world, myosekiId, "sale", stock.ownerId, buyerId, amount)
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

  // Self-lease is a no-op — parity with buyMyoseki's self-purchase guard.
  // A lease where owner and lessee resolve to the same heya sets up a
  // recurring weekly self-drain: tickMyosekiMarket debits the lessee
  // unconditionally while the owner credit is suppressed same-heya.
  if (stock.ownerId === lesseeId) return builder.build();

  const leaseFee = Math.floor(stock.askingPrice * MYOSEKI_LEASE_RATE_PERCENT);

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
