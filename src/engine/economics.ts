// economics.ts
// Institutional Economy & Finance Engine
// Bout rewards (Kensho), insolvency handling, and sponsor churn.
//
// NOTE: Weekly finance calculation (salary burn, koenkai income) is handled
// by the pipeline at src/engine/tick/phases/phase01_week_economy.ts,
// which uses FinanceCalculator.ts for the pure math.

import { RNGRegistry } from "./core/RNGRegistry";
import type { WorldState } from "./types/world";
import type { Heya } from "./types/heya";
import type { BoutResult, MatchSchedule } from "./types/basho";
import type { Rikishi } from "./types/rikishi";
import { reportScandal } from "./systems/governance/ScandalService";
import { calculateKenshoEnvelopes } from "./systems/economy/KenshoService";
import {
  processSponsorChurn as runSponsorChurnService,
  selectBenefactor,
} from "./systems/economy/SponsorshipService";
import {
  DEBT_LIMIT,
  BENEFACTOR_BAILOUT_AMOUNT,
  KENSHO_AMOUNT_PER_ENVELOPE,
  KENSHO_SPLIT,
  KINBOSHI_MARKETABILITY_BOOST,
  GINBOSHI_MARKETABILITY_BOOST,
  MARKETABILITY_POPULARITY_MULTIPLIER,
} from "../constants/engine/economic";
import { createImpactBuilder } from "./core/ImpactBuilder";
import type { StateImpact } from "./core/StateImpact";
import { getHeya } from "./queries";

// === INSOLVENCY HANDLER ===

/**
 * Handles insolvency for a heya when its funds fall below the debt limit.
 * Attempts a benefactor bailout at extreme debt; reports a scandal if no benefactor is available.
 *
 * @param {Heya} heya - The heya experiencing insolvency.
 * @param {WorldState} world - The current world state.
 * @returns {StateImpact} The state impact containing financial updates and queued events.
 */
export function handleInsolvency(heya: Heya, world: WorldState): StateImpact {
  const builder = createImpactBuilder("handleInsolvency");
  if (heya.funds >= DEBT_LIMIT) return builder.build();

  const pool = world.sponsorPool;
  const koenkai = pool?.koenkais.get(`koenkai_${heya.id}`);
  const benefactor = pool ? selectBenefactor(heya.id, pool, koenkai) : null;

  if (benefactor) {
    builder.updateHeya(heya.id, { funds: heya.funds + BENEFACTOR_BAILOUT_AMOUNT });
    builder.logEvent(
      "FINANCIAL_ALERT",
      "economy",
      {
        heyaname: heya.name,
        incident: "bailout",
        money: BENEFACTOR_BAILOUT_AMOUNT,
        sponsor: benefactor.displayName,
      },
      { heyaId: heya.id, importance: "major" }
    );
  } else if (heya.governanceStatus !== "sanctioned") {
    builder.merge(reportScandal(world, heya.id, "major", "Severe Insolvency / Debt Limit Breach"));
    // Cap debt so math doesn't spiral into infinity
    builder.updateHeya(heya.id, { funds: DEBT_LIMIT });
  }

  return builder.build();
}

// === BOUT REWARDS (KENSHO) ===

/**
 * Settles Kensho (prize money) rewards when a bout is resolved.
 * Implements real JSA model: ¥70,000 per envelope split as:
 *   ¥10,000 JSA fee (not credited to anyone)
 *   ¥30,000 cash to winner
 *   ¥30,000 to winner's retirement fund
 * Heya receives ¥0 from kensho (real-world JSA model).
 *
 * @param {WorldState} world - The current world state.
 * @param {Object} context - The context of the resolved bout.
 * @param {MatchSchedule} context.match - The match schedule entry.
 * @param {BoutResult} context.result - The result of the bout.
 * @param {Rikishi} context.east - The rikishi in the East position.
 * @param {Rikishi} context.west - The rikishi in the West position.
 * @returns {StateImpact} The state impact containing economic updates.
 */
export function onBoutResolvedEconomics(
  world: WorldState,
  context: { match: MatchSchedule; result: BoutResult; east: Rikishi; west: Rikishi }
): StateImpact {
  const { result, east, west } = context;
  const builder = createImpactBuilder("onBoutResolvedEconomics");

  // Only Makuuchi bouts generate Kensho normally
  if (east.division !== "makuuchi") return builder.build();

  const winner = result.winner === "east" ? east : west;
  const winnerHeya = getHeya(world, winner.heyaId);

  if (!winnerHeya) return builder.build();

  const existingEconomics = winner.economics || {
    cash: 0,
    retirementFund: 0,
    careerKenshoWon: 0,
    kinboshiCount: 0,
    totalEarnings: 0,
    currentBashoEarnings: 0,
    popularity: 50,
  };

  // Use envelope count from boutResolver if already set; otherwise calculate
  let kenshoCount = result.kenshoEnvelopes ?? 0;
  if (!result.kenshoEnvelopes && result.kenshoEnvelopes !== 0) {
    const kenshoRng = RNGRegistry.getSystemRNG(
      world,
      "kensho",
      `kensho-${winner.id}-${world.dayIndexGlobal}`
    );
    kenshoCount = calculateKenshoEnvelopes(
      world,
      winner,
      result.kenshoBanners || [],
      result.awardFact ?? undefined,
      kenshoRng
    );
    result.kenshoEnvelopes = kenshoCount;
  }

  // Marketability shift for kinboshi/ginboshi
  const marketabilityScale =
    result.awardFact === "kinboshi"
      ? KINBOSHI_MARKETABILITY_BOOST
      : result.awardFact === "ginboshi"
        ? GINBOSHI_MARKETABILITY_BOOST
        : 0;
  const existingMarketability = winner.marketability ?? 50;

  if (kenshoCount > 0) {
    const total = kenshoCount * KENSHO_AMOUNT_PER_ENVELOPE;

    // Real JSA model: ¥10K JSA fee + ¥30K cash + ¥30K retirement per envelope
    const cashToWinner = kenshoCount * KENSHO_SPLIT.cash;
    const retirementAdd = kenshoCount * KENSHO_SPLIT.retirement;

    const updatedEconomics = {
      ...existingEconomics,
      cash: existingEconomics.cash + cashToWinner,
      retirementFund: existingEconomics.retirementFund + retirementAdd,
      currentBashoEarnings: existingEconomics.currentBashoEarnings + cashToWinner,
      careerKenshoWon: existingEconomics.careerKenshoWon + kenshoCount,
      totalEarnings: existingEconomics.totalEarnings + cashToWinner,
      popularity: Math.min(
        100,
        existingEconomics.popularity + marketabilityScale * MARKETABILITY_POPULARITY_MULTIPLIER
      ),
    };

    builder.updateRikishi(winner.id, {
      economics: updatedEconomics,
      marketability: existingMarketability + marketabilityScale,
    });

    // Heya receives ¥0 from kensho (real-world JSA model)

    builder.logEvent(
      "AWARD_CONFERRED",
      "economy",
      {
        kensho: total,
        envelopes: kenshoCount,
        status: "kensho",
      },
      { rikishiId: winner.id, heyaId: winnerHeya.id }
    );
  } else if (marketabilityScale > 0) {
    // Update marketability even without kensho
    builder.updateRikishi(winner.id, {
      economics: {
        ...existingEconomics,
        popularity: Math.min(
          100,
          existingEconomics.popularity + marketabilityScale * MARKETABILITY_POPULARITY_MULTIPLIER
        ),
      },
      marketability: existingMarketability + marketabilityScale,
    });
  }

  return builder.build();
}

// === POST-BASHO SPONSOR CHURN (Constitution Addendum D) ===

/**
 * Executes the post-basho sponsor churn checks according to Constitution Addendum D.
 * Delegates to the `SponsorshipService`.
 *
 * @param {WorldState} world - The current world state.
 * @returns {StateImpact} The state impact describing sponsor churn updates.
 */
export function runSponsorChurn(world: WorldState): StateImpact {
  return runSponsorChurnService(world);
}
