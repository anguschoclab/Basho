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
import { worldWithQueuedFields } from "@/engine/core/ImpactBuilder";
import { generateOyakata } from "@/engine/npc/personas/oyakataPersonalities";
import { foundStable } from "@/engine/generation/WorldFactory";
import { generateAvatarIdentity } from "@/engine/generation/avatarGenerator";
import { recordOyakataHandover } from "@/engine/legacy/lineage";
import { rngForWorld } from "@/engine/core/rng";
import {
  FOUNDING_CHANCE,
  FOUNDING_FOLLOWER_MAX,
  FOUNDING_SEED_FUNDS,
  HEYA_SOFT_TARGET,
  HEYA_COUNT_FLOOR,
  HEYA_FOUNDING_RAMP,
  MERGER_THRESHOLD,
  MYOSEKI_TOTAL_COUNT,
  JUN_TOSHIYORI_YEARS_YOKOZUNA,
  JUN_TOSHIYORI_YEARS_OTHER,
  BRANCH_FOUNDING_SANYAKU_BASHO,
  BRANCH_FOUNDING_MAKUUCHI_BASHO,
  ICHIDAI_TOSHIYORI_YUSHO_THRESHOLD,
} from "@/constants/engine/economic";
import { getHeya } from "@/engine/core/queries";
import { getCitizenshipStatus } from "@/engine/utils/citizenshipUtils";
import { isSekitoriDivision, isYokozunaOrOzekiRank } from "@/constants/engine/rankDisplay";
import { stableSort } from "@/engine/utils/sort";

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
    isYokozunaOrOzekiRank(retiree.rank) || retiree.rank === "sekiwake" || retiree.careerWins >= 200;

  if (age < 28 || !isAccomplished) return;

  // JSA rule: Japanese citizenship is mandatory for toshiyori (elder) status.
  // A foreign-born retiree who never naturalized cannot stay as a coach —
  // naturalization still unlocks elder life even though (post-2010) it never
  // freed the active-roster foreign slot.
  if (getCitizenshipStatus(retiree, world.year) === "foreign") return;

  // The myoseki market is only lazily created by the impact resolver, so a freshly
  // generated (e.g. headless-sim) world may not have one yet. Treat a missing market
  // as empty rather than bailing — otherwise founding never fires in the 25-year sim.
  // Read the market already queued on this builder so a same-batch transfer (a
  // second conversion, or a succession reseat) composes on it instead of
  // reverting to the pre-batch snapshot under last-wins merge (S1-3/S1-4).
  const market = worldWithQueuedFields(world, builder).myosekiMarket ?? {
    stocks: {},
    history: [],
  };

  // Use seeded RNG — needed both for merit-stock id and the oyakata/founding logic below.
  const rng = rngForWorld(world, "governance", `retirement_${id}`);

  // WS-17 — evaluate founding BEFORE elder-share resolution: the founding
  // career bar (peak-Y/O OR 12 sanyaku OR 25 makuuchi basho) is wider than
  // the jun_toshiyori credential, so at a saturated kabu market eligible
  // veterans would otherwise early-return below and never be evaluated —
  // measured `founded=0` over a full 25-yr diagnostic. The founder's elder
  // standing follows the founding, it does not gate it.
  const foundingQualified = evaluateFoundingEligibility(world, retiree).canFound;

  const { availableStock, elderStatus, elderExpiryYear } = resolveElderShare(
    world,
    market,
    retiree,
    rng,
    foundingQualified
  );
  // No stock and no credential — real JSA: the retiree simply retires.
  if (elderStatus == null) return;

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
  // Hairstyle/graying re-derive from age+role at render time. Weight carries
  // too — a heavy retiree keeps his build (avatar fullness only).
  if (retiree.avatarConfig) {
    newOyakata.avatarConfig = { ...retiree.avatarConfig, role: "oyakata" };
  } else {
    newOyakata.avatarConfig = generateAvatarIdentity({
      seed: newOyakataId,
      nationality: "Japan",
      role: "oyakata",
    });
  }
  if (retiree.weight != null) newOyakata.weight = retiree.weight;

  newOyakata.elderStatus = elderStatus;
  if (elderExpiryYear !== undefined) newOyakata.elderExpiryYear = elderExpiryYear;

  if (availableStock) {
    const isOwnShare =
      availableStock.ownerId === id || availableStock.holderId === id;
    queueMeritStockTransfer(world, market, availableStock, newOyakataId, rng, builder, {
      fromId: isOwnShare ? id : "JSA",
      amount: isOwnShare ? 0 : retiree.economics?.retirementFund || 150000000,
    });
  }

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
      regimen: availableStock?.name ?? elderStatus, // myoseki name or elder status
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
    builder.merge(
      recordOyakataHandover(
        world,
        retiree.heyaId,
        newOyakataId,
        availableStock?.name ?? elderStatus
      )
    );
  }
}

type Market = NonNullable<WorldState["myosekiMarket"]>;
type Rng = ReturnType<typeof rngForWorld>;
type Stock = Market["stocks"][string];
type ElderStatus = NonNullable<import("@/engine/types/oyakata").Oyakata["elderStatus"]>;

/**
 * Resolve the retiree's elder share + status.
 *
 * Only unclaimed JSA pool stock is eligible — an "available" stock owned by a
 * player/NPC is a live listing and must never be confiscated by conversion.
 * Merit issuance is bounded by the real kabu pool: the JSA's 105 elder names
 * are a fixed supply — merit claims an unclaimed share, never a 106th.
 * Stock exhausted: only credential-tier retirees can still hold elder
 * status — jun-toshiyori (準年寄, temporary) for sanyaku+, ichidai-toshiyori
 * (一代年寄, one-generation non-transferable) for a great yokozuna.
 */
function resolveElderShare(
  world: WorldState,
  market: Market,
  retiree: Rikishi,
  rng: Rng,
  foundingQualified = false
): {
  availableStock: Stock | null;
  elderStatus: ElderStatus | null;
  elderExpiryYear?: number;
} {
  const id = retiree.id;
  // Sekitori reserve: a stock the retiree already held as an active rikishi
  // reseats onto his oyakata name — his elder life was pre-secured.
  const ownShare = Object.values(market.stocks).find(
    (s) => s.ownerId === retiree.id || s.holderId === retiree.id
  );
  const existing = Object.values(market.stocks).find(
    (s) => s.status === "available" && s.ownerId === "JSA"
  );
  const canMint = Object.keys(market.stocks).length < MYOSEKI_TOTAL_COUNT;
  const availableStock: Stock | null =
    ownShare ??
    existing ??
    (canMint
      ? {
          id: rng.uuid("MY"),
          name: `${retiree.shikona ?? retiree.name ?? id}-myoseki`,
          prestigeTier: "modest" as const,
          ownerId: "JSA",
          holderId: "JSA",
          status: "available" as const,
          askingPrice: undefined,
        }
      : null);

  const yushoCount = (retiree.careerHistory ?? []).reduce(
    (a, h) => a + (h.isYusho ? 1 : 0),
    0
  );
  const elderStatus: ElderStatus | null =
    availableStock != null
      ? "toshiyori"
      : retiree.rank === "yokozuna" && yushoCount >= ICHIDAI_TOSHIYORI_YUSHO_THRESHOLD
        ? "ichidai_toshiyori"
        // Post-2006 rules: jun-toshiyori grace is Yokozuna/Ōzeki only —
        // Komusubi/Sekiwake without stock get no elder status. The test is
        // PEAK rank, not final rank: an ex-ōzeki demoted to sekiwake before
        // intai still earned the credential during his career.
        : isYokozunaOrOzekiRank(retiree.rank) ||
            (retiree.careerHistory ?? []).some((h) => isYokozunaOrOzekiRank(h.rank))
          ? "jun_toshiyori"
          // WS-17 — founding-qualified without stock or Y/O credential: the
          // JSA branch-approval provisional license. A veteran who clears the
          // founding career bar (25 san / 60 M basho) may hold bounded elder
          // standing to attempt the branch; he must convert it to a real share
          // within the grace window or elder life expires (standard rules).
          : foundingQualified
            ? "jun_toshiyori"
            : null;
  const elderExpiryYear =
    elderStatus === "jun_toshiyori"
      ? world.year +
        (retiree.rank === "yokozuna" ? JUN_TOSHIYORI_YEARS_YOKOZUNA : JUN_TOSHIYORI_YEARS_OTHER)
      : undefined;
  return { availableStock, elderStatus, elderExpiryYear };
}

/** Queue the myoseki transfer + transaction record for the retiree's new stock. */
function queueMeritStockTransfer(
  world: WorldState,
  market: Market,
  availableStock: Stock,
  newOyakataId: string,
  rng: Rng,
  builder: ImpactBuilder,
  txSpec: { fromId: string; amount: number }
): void {
  const nextStocks = { ...market.stocks };
  // availableStock may be freshly minted above (not yet in market.stocks), so
  // this is a full upsert — the granular myosekiUpdates merge can't insert.
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
    fromId: txSpec.fromId,
    toId: newOyakataId,
    amount: txSpec.amount,
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
  /** JSA establishment underwriting — active only below HEYA_COUNT_FLOOR. */
  jsaBacked: boolean;
  parentHeyaId?: string;
} {
  const none = { canFound: false, effectiveChance: 0, parentSponsors: false, jsaBacked: false };
  const parentHeya = getHeya(world, retiree.heyaId);
  if (!parentHeya) return none;

  const parentViable =
    parentHeya.welfareState?.complianceState !== "sanctioned" &&
    (parentHeya.funds ?? 0) > MERGER_THRESHOLD;
  if (!parentViable) return none;

  const headroomToTarget = HEYA_SOFT_TARGET - world.heyas.size;
  if (headroomToTarget <= 0) return none;

  // Below the league floor the JSA underwrites the founding — a shrinking
  // stable count is institutional, so the association backs a qualified
  // founder's branch when neither he nor the parent can fund the seed.
  const jsaBacked = world.heyas.size < HEYA_COUNT_FLOOR;
  // Solvency = total wealth — the retirement account is only the
  // JSA-managed slice (kenshō splits + prize halves); a sekitori's salary
  // lands in cash, and at intai he liquidates everything anyway. Real
  // founders fund branches from career earnings, not the nenkin balance.
  const liquidWealth =
    (retiree.economics?.retirementFund ?? 0) + (retiree.economics?.cash ?? 0);
  const personallySolvent = liquidWealth >= FOUNDING_SEED_FUNDS;
  const parentCanSponsor = (parentHeya.funds ?? 0) >= FOUNDING_SEED_FUNDS * 2;
  if (!personallySolvent && !parentCanSponsor && !jsaBacked) return none;

  // WS-6 — branch-out (bunke) is the ELITE tier of the eligibility ladder:
  // Yokozuna/Ōzeki peak, 12 sanyaku basho, or 25 makuuchi basho. A career
  // sekiwake cannot found a stable no matter his bank balance.
  const SANYAKU = new Set(["yokozuna", "ozeki", "sekiwake", "komusubi"]);
  const history = retiree.careerHistory ?? [];
  const sanyakuBasho = history.filter((h) => SANYAKU.has(h.rank)).length;
  const makuuchiBasho = history.filter((h) => h.division === "makuuchi").length;
  const peakElite =
    isYokozunaOrOzekiRank(retiree.rank) ||
    history.some((h) => isYokozunaOrOzekiRank(h.rank));
  if (
    !peakElite &&
    sanyakuBasho < BRANCH_FOUNDING_SANYAKU_BASHO &&
    makuuchiBasho < BRANCH_FOUNDING_MAKUUCHI_BASHO
  ) {
    return none;
  }

  // Restoration pressure comes through eligibility — JSA underwriting
  // widens who can found — while the headroom ramp stays a pure
  // count-distance function either way.
  const effectiveChance = FOUNDING_CHANCE * Math.min(1, headroomToTarget / HEYA_FOUNDING_RAMP);
  return {
    canFound: effectiveChance > 0,
    effectiveChance,
    parentSponsors: !personallySolvent && parentCanSponsor,
    jsaBacked: jsaBacked && !personallySolvent && !parentCanSponsor,
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

  const parent = getHeya(world, eligibility.parentHeyaId);

  // WS-6 — roster-follow: a founder brings a handful of his deshi from the
  // parent's unsalaried divisions (real dokuritsu convention — sekitori
  // never follow; their rank belongs to the parent heya's sheet slot).
  const followerPool = stableSort(
    (parent?.rikishiIds ?? [])
      .map((id) => world.rikishi.get(id))
      .filter((r): r is Rikishi => !!r && r.id !== retiree.id && !isSekitoriDivision(r.division)),
    (r) => r.id
  );
  const followerIds: string[] = [];
  while (followerIds.length < FOUNDING_FOLLOWER_MAX && followerPool.length > 0) {
    followerIds.push(followerPool.splice(Math.floor(rng.next() * followerPool.length), 1)[0].id);
  }
  if (followerIds.length > 0) {
    result.heya.rikishiIds = followerIds;
    for (const id of followerIds) builder.updateRikishi(id, { heyaId: result.heya.id });
  }

  // Parent-sponsored founding: the seed is real wealth, transferred from the
  // sponsoring stable — not conjured money. Followers leave the parent sheet.
  const parentPatch: { funds?: number; rikishiIds?: string[] } = {};
  if (eligibility.parentSponsors) {
    parentPatch.funds = (parent?.funds ?? 0) - FOUNDING_SEED_FUNDS;
  }
  if (followerIds.length > 0) {
    const followerSet = new Set(followerIds);
    parentPatch.rikishiIds = (parent?.rikishiIds ?? []).filter((id) => !followerSet.has(id));
  }
  if (Object.keys(parentPatch).length > 0) {
    builder.updateHeya(eligibility.parentHeyaId, parentPatch);
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
