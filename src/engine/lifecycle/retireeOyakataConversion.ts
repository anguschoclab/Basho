/**
 * retireeOyakataConversion.ts
 * ===========================
 * Shared helper: accomplished retiree → oyakata conversion → (RNG-gated) stable founding.
 *
 * Called by the unified retirement processor (./processRetirements.ts), which
 * every retirement path delegates to.
 *
 * Called unconditionally for any retiree — the age + accomplishment guard is INSIDE
 * this helper, so callers do not need to pre-filter.
 */

import type { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";
import type { ImpactBuilder } from "@/engine/core/ImpactBuilder";
import { generateOyakata } from "@/engine/npc/personas/oyakataPersonalities";
import { foundStable } from "@/engine/generation/WorldFactory";
import { generateAvatarIdentity } from "@/engine/generation/avatarGenerator";
import { recordOyakataHandover } from "@/engine/legacy/lineage";
import { rngForWorld } from "@/engine/core/rng";
import {
  FOUNDING_CHANCE,
  FOUNDING_SEED_FUNDS,
  HEYA_SOFT_TARGET,
  HEYA_FOUNDING_RAMP,
  MERGER_THRESHOLD,
} from "@/constants/engine/economic";
import { getHeya } from "@/engine/core/queries";

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

  // Only unclaimed JSA pool stock is eligible — an "available" stock owned by a
  // player/NPC is a live listing and must never be confiscated by conversion.
  const existing = Object.values(market.stocks).find(
    (s) => s.status === "available" && s.ownerId === "JSA"
  );

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

  // Carry the wrestler's face into elder life: same identity, new role.
  // Hairstyle/graying re-derive from age+role at render time.
  if (retiree.avatarConfig) {
    newOyakata.avatarConfig = { ...retiree.avatarConfig, role: "oyakata" };
  } else {
    newOyakata.avatarConfig = generateAvatarIdentity({
      seed: newOyakataId,
      nationality: "Japan",
      role: "oyakata",
    });
  }

  queueMeritStockTransfer(world, market, availableStock, newOyakataId, retiree, rng, builder);

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

  // Handover only when the old heya's chair is actually vacant — a retiree
  // previously deposed the sitting oyakata unconditionally, and the later
  // founding path could leave a stale oyakataId on the old heya.
  const oldHeya = getHeya(world, retiree.heyaId);
  const chairVacant = !oldHeya?.oyakataId || !world.oyakata?.has(oldHeya.oyakataId);

  const foundedHeya = maybeFoundStable(world, retiree, newOyakataId, rng, builder);

  // Take over the old heya only when the chair is vacant and the retiree did
  // not just found a new stable — previously the handover ran unconditionally,
  // deposing a sitting oyakata or leaving a stale oyakataId after founding.
  if (!foundedHeya && chairVacant) {
    builder.merge(recordOyakataHandover(world, retiree.heyaId, newOyakataId, availableStock.name));
  }
}

type Market = NonNullable<WorldState["myosekiMarket"]>;
type Rng = ReturnType<typeof rngForWorld>;
type Stock = Market["stocks"][string];

/** Queue the myoseki transfer + transaction record for the retiree's new stock. */
function queueMeritStockTransfer(
  world: WorldState,
  market: Market,
  availableStock: Stock,
  newOyakataId: string,
  retiree: Rikishi,
  rng: Rng,
  builder: ImpactBuilder
): void {
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

  builder.updateWorldField("myosekiMarket", {
    ...market,
    stocks: nextStocks,
    history: [tx, ...market.history],
  });
}

/**
 * Pure eligibility predicate for stable founding — models the real JSA
 * branching constraints (dokuritsu) with no RNG consumption:
 * - Parent approval: the retiree's stable must exist and be able to release
 *   a branch — a sanctioned or insolvent heya cannot approve a founding.
 * - Financial backing: the retiree's retirement fund must cover the seed,
 *   or the parent stable must be wealthy enough to sponsor the branch.
 * - League equilibrium: founding pressure decays to zero as the stable
 *   count approaches HEYA_SOFT_TARGET; HEYA_COUNT_CAP is only a backstop.
 *
 * Exported for tests — the stochastic gate is a single `rng.bool` call in
 * the caller, so the whole constraint matrix stays deterministic.
 */
export function evaluateFoundingEligibility(
  world: WorldState,
  retiree: Rikishi
): {
  canFound: boolean;
  effectiveChance: number;
  parentSponsors: boolean;
  parentHeyaId?: string;
} {
  const none = { canFound: false, effectiveChance: 0, parentSponsors: false };
  const parentHeya = getHeya(world, retiree.heyaId);
  if (!parentHeya) return none;

  const parentViable =
    parentHeya.welfareState?.complianceState !== "sanctioned" &&
    (parentHeya.funds ?? 0) > MERGER_THRESHOLD;
  if (!parentViable) return none;

  const personallySolvent =
    (retiree.economics?.retirementFund ?? 0) >= FOUNDING_SEED_FUNDS;
  const parentCanSponsor = (parentHeya.funds ?? 0) >= FOUNDING_SEED_FUNDS * 2;
  if (!personallySolvent && !parentCanSponsor) return none;

  const headroomToTarget = HEYA_SOFT_TARGET - world.heyas.size;
  if (headroomToTarget <= 0) return none;

  const effectiveChance =
    FOUNDING_CHANCE * Math.min(1, headroomToTarget / HEYA_FOUNDING_RAMP);
  return {
    canFound: effectiveChance > 0,
    effectiveChance,
    parentSponsors: !personallySolvent && parentCanSponsor,
    parentHeyaId: parentHeya.id,
  };
}

/** RNG-gated chance to found a new heya. Returns true when founding succeeded. */
function maybeFoundStable(
  world: WorldState,
  retiree: Rikishi,
  newOyakataId: string,
  rng: Rng,
  builder: ImpactBuilder
): boolean {
  const eligibility = evaluateFoundingEligibility(world, retiree);
  if (!eligibility.canFound || !eligibility.parentHeyaId) return false;
  if (!rng.bool(eligibility.effectiveChance)) return false;

  const result = foundStable(
    world,
    newOyakataId,
    `${retiree.shikona ?? retiree.name ?? retiree.id}-beya`,
    rng,
    { parentHeyaId: eligibility.parentHeyaId }
  );
  if (!result) return false;

  // Parent-sponsored founding: the seed is real wealth, transferred from the
  // sponsoring stable — not conjured money.
  if (eligibility.parentSponsors) {
    const parent = getHeya(world, eligibility.parentHeyaId);
    builder.updateHeya(eligibility.parentHeyaId, {
      funds: (parent?.funds ?? 0) - FOUNDING_SEED_FUNDS,
    });
  }

  builder.addHeya(result.heya);
  builder.logEvent(
    "LIFECYCLE_EVENT",
    "career",
    {
      rikishiId: retiree.id,
      heyaId: result.heya.id,
      shikona: retiree.shikona ?? retiree.name ?? retiree.id,
      status: "stable_founded",
      heyaName: result.heya.name,
      ichimon: result.heya.ichimon,
      branchedFromHeyaId: eligibility.parentHeyaId,
    },
    { heyaId: result.heya.id, rikishiId: retiree.id, importance: "headline" }
  );
  return true;
}
