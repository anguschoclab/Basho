// economics.ts
// Institutional Economy & Finance Engine
// Bout rewards (Kensho), insolvency handling, and sponsor churn.
//
// NOTE: Weekly finance calculation (salary burn, koenkai income) is handled
// by the pipeline at src/engine/tick/phases/phase01_economy.ts,
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
  selectBenefactor
} from "./systems/economics/SponsorshipService";
import {
  DEBT_LIMIT,
  BENEFACTOR_BAILOUT_AMOUNT,
  KENSHO_AMOUNT_PER_ENVELOPE,
} from "./constants/EconomicConstants";

// === INSOLVENCY HANDLER ===

/**
 * Called after weekly funds update when heya.funds < 0.
 * Attempts a benefactor bailout at extreme debt; reports scandal if none available.
 * STATEFUL: mutates heya.funds directly.
 */
export function handleInsolvency(heya: Heya, world: WorldState): void {
  if (heya.funds >= DEBT_LIMIT) return;

  const pool = world.sponsorPool;
  const koenkai = pool?.koenkais.get(`koenkai_${heya.id}`);
  const rng = RNGRegistry.getSystemRNG(world, "economics", `bailout-${heya.id}-${world.dayIndexGlobal}`);

  const benefactor = pool ? selectBenefactor(heya.id, pool, koenkai, rng) : null;

  if (benefactor) {
    heya.funds += BENEFACTOR_BAILOUT_AMOUNT;
    EventBus.financialAlert(world, heya.id,
      "Benefactor Bailout",
      `${benefactor.displayName} has provided a ¥${(BENEFACTOR_BAILOUT_AMOUNT / 1_000_000).toFixed(0)}M emergency infusion to stabilize ${heya.name}.`,
      { benefactorId: benefactor.sponsorId, amount: BENEFACTOR_BAILOUT_AMOUNT }
    );
  } else if (heya.governanceStatus !== "sanctioned") {
    reportScandal(world, heya.id, "major", "Severe Insolvency / Debt Limit Breach");
    // Cap debt so math doesn't spiral into infinity
    heya.funds = DEBT_LIMIT;
  }
}

// === BOUT REWARDS (KENSHO) ===

/**
 * Called when a bout concludes to settle Kensho (Prize Money).
 * Constitution §6: ¥70,000/banner, 50/50 rikishi/heya split.
 * 30% of rikishi share → retirement fund.
 */
export function onBoutResolvedEconomics(
  world: WorldState,
  context: { match: MatchSchedule; result: BoutResult; east: Rikishi; west: Rikishi }
): void {
  const { result, east, west } = context;

  // Only Makuuchi bouts generate Kensho normally
  if (east.division !== "makuuchi") return;

  const winner = result.winner === "east" ? east : west;
  const winnerHeya = world.heyas.get(winner.heyaId);

  if (!winner.economics) {
    winner.economics = { cash: 0, retirementFund: 0, careerKenshoWon: 0, kinboshiCount: 0, totalEarnings: 0, currentBashoEarnings: 0, popularity: 50 };
  }

  // Use envelope count from boutResolver if already set; otherwise calculate
  let kenshoCount = result.kenshoEnvelopes ?? 0;
  if (!result.kenshoEnvelopes && result.kenshoEnvelopes !== 0) {
    const kenshoRng = RNGRegistry.getSystemRNG(world, "kensho", `kensho-${winner.id}-${world.dayIndexGlobal}`);
    kenshoCount = calculateKenshoEnvelopes(world, winner, result.awardFact ?? undefined, kenshoRng);
    result.kenshoEnvelopes = kenshoCount;
  }

  // Marketability shift for kinboshi/ginboshi
  const marketabilityScale = result.awardFact === 'kinboshi' ? 5 : result.awardFact === 'ginboshi' ? 2 : 0;
  if (marketabilityScale > 0) {
    if ((winner as any).marketability === undefined) (winner as any).marketability = 50;
    (winner as any).marketability += marketabilityScale;
    winner.economics.popularity = Math.min(100, winner.economics.popularity + (marketabilityScale * 2));
  }

  if (kenshoCount > 0 && winnerHeya) {
    const total = kenshoCount * KENSHO_AMOUNT_PER_ENVELOPE;

    // Constitution: 50/50 split rikishi/heya
    const rikishiGross = total * 0.5;
    const stableShare = total * 0.5;

    // Constitution: 30% of rikishi share → retirement fund
    const retirementDiversion = rikishiGross * 0.3;
    const rikishiNet = rikishiGross - retirementDiversion;

    winner.economics.cash += rikishiNet;
    winner.economics.retirementFund += retirementDiversion;
    winner.economics.currentBashoEarnings += rikishiNet;
    winner.economics.careerKenshoWon += kenshoCount;
    winner.economics.totalEarnings += rikishiNet;

    winnerHeya.funds += stableShare;

    EventBus.kenshoAwarded(world, winner.id, winnerHeya.id, total, kenshoCount);
  }
}

// === POST-BASHO SPONSOR CHURN (Constitution Addendum D) ===

/**
 * Run post-basho sponsor churn checks per Constitution Addendum D.
 * Delegates to authoritative SponsorshipService.
 */
export function runSponsorChurn(world: WorldState): { churned: string[]; retained: number } {
  return runSponsorChurnService(world);
}
