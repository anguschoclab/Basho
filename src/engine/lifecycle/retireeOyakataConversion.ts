/**
 * retireeOyakataConversion.ts
 * ===========================
 * Shared helper: accomplished retiree → oyakata conversion → (RNG-gated) stable founding.
 *
 * Extracted from governanceReview.ts `runRetirements` so the same logic runs in
 * BOTH the governance review path AND the AutoSim CareerService path.
 *
 * Called unconditionally for any retiree — the age + accomplishment guard is INSIDE
 * this helper, so callers do not need to pre-filter.
 */

import type { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";
import type { ImpactBuilder } from "@/engine/core/ImpactBuilder";
import { generateOyakata } from "@/engine/oyakataPersonalities";
import { foundStable } from "@/engine/systems/generation/WorldFactory";
import { updateAvatarForAging } from "@/engine/avatarGenerator";
import { recordOyakataHandover } from "@/engine/lineage";
import { rngForWorld } from "@/engine/rng";
import { FOUNDING_CHANCE } from "@/constants/engine/economic";

/**
 * If `retiree` is accomplished and of eligible age, converts them to an oyakata,
 * mints (or reuses) a myoseki stock, and with a seeded RNG gate may found a new heya.
 *
 * All mutations are queued into `builder` — nothing is applied to `world` directly.
 */
export function processRetireeOyakataConversion(
  world: WorldState,
  retiree: Rikishi,
  builder: ImpactBuilder
): void {
  const id = retiree.id;

  // Constitution 2.3 & 61: Oyakata candidate eligibility
  const age = world.year - retiree.birthYear;
  const isAccomplished =
    retiree.rank === "yokozuna" ||
    retiree.rank === "ozeki" ||
    retiree.rank === "sekiwake" ||
    retiree.careerWins >= 200;

  if (age < 28 || !isAccomplished) return;

  // The myoseki market is only lazily created by the impact resolver, so a freshly
  // generated (e.g. headless-sim) world may not have one yet. Treat a missing market
  // as empty rather than bailing — otherwise founding never fires in the 25-year sim.
  const market = world.myosekiMarket ?? { stocks: {}, history: [] };

  // Use seeded RNG — needed both for merit-stock id and the oyakata/founding logic below.
  const rng = rngForWorld(world, "governance", `retirement_${id}`);

  const existing = Object.values(market.stocks).find((s) => s.status === "available");

  // Merit issuance: without this the fixed pool stays fully held and no new stables
  // ever form over a 25-year NPC sim. An accomplished retiree always earns an elder
  // name — models JSA merit-elder-name issuance (Constitution §61).
  const availableStock = existing ?? {
    id: rng.uuid("MY"),
    name: `${retiree.shikona ?? retiree.name ?? id}-myoseki`,
    prestigeTier: "modest" as const,
    ownerId: "JSA",
    holderId: "JSA",
    status: "available" as const,
    askingPrice: undefined,
  };

  // Become an Oyakata
  const newOyakataId = rng.uuid("OY");
  const newOyakata = generateOyakata(
    newOyakataId,
    retiree.heyaId,
    retiree.shikona ?? retiree.name ?? id,
    age,
    undefined,
    {
      aggression: retiree.stats.aggression,
      experience: retiree.stats.experience,
      adaptability: retiree.stats.adaptability,
      momentum: retiree.momentum,
    },
    retiree.rank,
    retiree.shikona
  );

  // Transfer and update rikishi avatar to oyakata
  if (retiree.avatarConfig) {
    newOyakata.avatarConfig = {
      ...updateAvatarForAging(retiree.avatarConfig, age),
      hairstyle: "oyakata",
    };
  }

  // Queue Myoseki update
  const nextStocks = { ...market.stocks };
  nextStocks[availableStock.id] = {
    ...availableStock,
    ownerId: newOyakataId,
    holderId: newOyakataId,
    status: "held",
    askingPrice: undefined,
  };

  const tx = {
    id: rng.uuid("MT"),
    date: `${world.year}-W${world.week || 1}`,
    myosekiId: availableStock.id,
    type: "sale" as const,
    fromId: "JSA",
    toId: newOyakataId,
    amount: retiree.economics?.retirementFund || 150000000,
  };

  const nextHistory = [tx, ...market.history];

  builder.updateWorldField("myosekiMarket", {
    ...market,
    stocks: nextStocks,
    history: nextHistory,
  });

  // Queue Oyakata add (newly generated, not an update)
  builder.addOyakata(newOyakata);

  builder.logEvent(
    "LIFECYCLE_EVENT",
    "career",
    {
      rikishiId: id,
      heyaId: retiree.heyaId,
      shikona: retiree.shikona ?? retiree.name ?? id,
      status: "elder_stock_acquired",
      regimen: availableStock.name, // myoseki name
    },
    { heyaId: retiree.heyaId, rikishiId: id }
  );

  // Merge handover impact
  builder.merge(recordOyakataHandover(world, retiree.heyaId, newOyakataId, availableStock.name));

  // Stable founding: RNG-gated chance for the new oyakata to found a new heya
  // instead of staying in their original stable. Cap check is inside foundStable.
  if (rng.bool(FOUNDING_CHANCE)) {
    const result = foundStable(
      world,
      newOyakataId,
      `${retiree.shikona ?? retiree.name ?? id}-beya`,
      rng
    );
    if (result) {
      builder.addHeya(result.heya);
      builder.logEvent(
        "LIFECYCLE_EVENT",
        "career",
        {
          rikishiId: id,
          heyaId: result.heya.id,
          shikona: retiree.shikona ?? retiree.name ?? id,
          status: "stable_founded",
          heyaName: result.heya.name,
        },
        { heyaId: result.heya.id, rikishiId: id, importance: "headline" }
      );
    }
  }
}
