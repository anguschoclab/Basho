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
import { reportScandal } from "./governance/GovernanceService";
import { EventBus } from "./events";
import { calculateKenshoEnvelopes } from "./systems/economics/KenshoService";
import {
  processSponsorChurn as runSponsorChurnService,
  selectBenefactor,
} from "./systems/economics/SponsorshipService";
import {
  DEBT_LIMIT,
  BENEFACTOR_BAILOUT_AMOUNT,
  KENSHO_AMOUNT_PER_ENVELOPE,
} from "./constants/EconomicConstants";
import { createImpactBuilder } from "./core/ImpactBuilder";
import type { StateImpact } from "./core/StateImpact";

// === INSOLVENCY HANDLER ===

/**
 * Handles insolvency for a heya when its funds fall below the debt limit.
 * Attempts a benefactor bailout at extreme debt; reports a scandal if no benefactor is available.
 *
 * @param {Heya} heya - The heya experiencing insolvency.
 * @param {WorldState} world - The current world state.
 */
export function handleInsolvency(heya: Heya, world: WorldState): void {
  if (heya.funds >= DEBT_LIMIT) return;

  const pool = world.sponsorPool;
  const koenkai = pool?.koenkais.get(`koenkai_${heya.id}`);
  const benefactor = pool ? selectBenefactor(heya.id, pool, koenkai) : null;

  if (benefactor) {
    heya.funds += BENEFACTOR_BAILOUT_AMOUNT;
    EventBus.financialAlert(world, heya.id, {
      heyaname: heya.name,
      incident: "bailout",
      money: BENEFACTOR_BAILOUT_AMOUNT,
      sponsor: benefactor.displayName,
    });
  } else if (heya.governanceStatus !== "sanctioned") {
    reportScandal(world, heya.id, "major", "Severe Insolvency / Debt Limit Breach");
    // Cap debt so math doesn't spiral into infinity
    heya.funds = DEBT_LIMIT;
  }
}

// === BOUT REWARDS (KENSHO) ===

/**
 * Settles Kensho (prize money) rewards when a bout is resolved.
 * Implements Constitution §6: ¥70,000 per envelope, with a 50/50 split between rikishi and heya.
 * 30% of the rikishi's share is diverted to their retirement fund.
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
  const winnerHeya = world.heyas.get(winner.heyaId);

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
    result.awardFact === "kinboshi" ? 5 : result.awardFact === "ginboshi" ? 2 : 0;
  const existingMarketability = winner.marketability ?? 50;

  if (kenshoCount > 0) {
    const total = kenshoCount * KENSHO_AMOUNT_PER_ENVELOPE;

    // Constitution: 50/50 split rikishi/heya
    const rikishiGross = total * 0.5;
    const stableShare = total * 0.5;

    // Constitution: 30% of rikishi share → retirement fund
    const retirementDiversion = rikishiGross * 0.3;
    const rikishiNet = rikishiGross - retirementDiversion;

    const updatedEconomics = {
      ...existingEconomics,
      cash: existingEconomics.cash + rikishiNet,
      retirementFund: existingEconomics.retirementFund + retirementDiversion,
      currentBashoEarnings: existingEconomics.currentBashoEarnings + rikishiNet,
      careerKenshoWon: existingEconomics.careerKenshoWon + kenshoCount,
      totalEarnings: existingEconomics.totalEarnings + rikishiNet,
      popularity: Math.min(100, existingEconomics.popularity + marketabilityScale * 2),
    };

    builder.updateRikishi(winner.id, {
      economics: updatedEconomics,
      marketability: existingMarketability + marketabilityScale,
    });

    builder.updateHeya(winnerHeya.id, {
      funds: winnerHeya.funds + stableShare,
    });

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
        popularity: Math.min(100, existingEconomics.popularity + marketabilityScale * 2),
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
