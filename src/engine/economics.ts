// economics.ts
// Institutional Economy & Finance Engine
// Manages Money, Solvency, Salaries, and Support.
// Aligned with Institutional Economy V2.0 Spec.

import { RNGRegistry } from "./core/RNGRegistry";
import type { WorldState } from "./types/world";
import type { Heya } from "./types/heya";
import type { BoutResult, MatchSchedule } from "./types/basho";
import type { Rikishi } from "./types/rikishi";
import type { Id } from "./types/common";
import { reportScandal } from "./governance/GovernanceService";
import { RANK_HIERARCHY } from "./banzuke";
import { EventBus } from "./events";
import { calculateKenshoEnvelopes } from "./systems/economics/KenshoService";
import { 
  calculateKoenkaiIncome, 
  processSponsorChurn as runSponsorChurnService,
  selectBenefactor
} from "./systems/economics/SponsorshipService";

// === CONSTANTS ===

const BASE_FACILITY_COST = 50_000; // Base weekly upkeep per facility point
const OYAKATA_SALARY_MONTHLY = 1_200_000; // Standard salary
const RECRUITMENT_BUDGET_WEEKLY = 100_000; // Baseline scouting burn

// Reputation -> Weekly Supporter Income Multiplier
// Removed: logic now centralized in SponsorshipService.ts
// const SUPPORTER_INCOME_FACTOR = 15_000; 

// === CORE LOGIC ===

/**
 * Process weekly economic updates.
 * - Deduct burn (Salaries, Facilities)
 * - Add income (Koenkai)
 * - Check Solvency
 */
export function tickWeekEconomics(world: WorldState): void {
  for (const heya of world.heyas.values()) {
    processHeyaFinances(heya, world);
  }
}


/**
 * Process heya finances.
 *  * @param heya - The Heya.
 *  * @param world - The World.
 */
function processHeyaFinances(heya: Heya, world: WorldState): void {
  // 1. Calculate Expenses (Weekly Burn)
  
  // A. Rikishi Salaries (Monthly -> Weekly approx)
  let rikishiSalaries = 0;
  for (const rId of (heya.rikishiIds || [])) {
    const rikishi = world.rikishi.get(rId);
    if (rikishi) {
      const info = RANK_HIERARCHY[rikishi.rank];
      if (info.isSekitori) {
        rikishiSalaries += (info.salary / 4); // Weekly slice
      } else {
        // Allowance for non-sekitori
        rikishiSalaries += 15_000; // Small allowance
      }
    }
  }

  // B. Staff & Facilities
  // Facility maintenance scales with quality
  const facilityUpkeep = !heya.facilities ? 0 :
    (heya.facilities.training * 1000) + 
    (heya.facilities.recovery * 1000) + 
    (heya.facilities.nutrition * 2000); // Food is expensive!

  const staffCount = heya.staffIds?.length || 0;
  const staffUpkeep = staffCount * 6000;

  const oyakataCost = OYAKATA_SALARY_MONTHLY / 4;
  // Essential burn must be paid (roster, staff, facilities)
  const baseBurn = rikishiSalaries + facilityUpkeep + staffUpkeep;
  // Overhead (Oyakata salary, recruitment) is supplementary
  const totalBurn = baseBurn + oyakataCost + RECRUITMENT_BUDGET_WEEKLY;

  // 2. Calculate Income (Koenkai / Supporters)
  // Constitution: Support is disbursed weekly.
  const monthlyKoenkaiIncome = calculateKoenkaiIncome(heya.koenkaiBand || "none");
  const supporterIncome = monthlyKoenkaiIncome / 4; // Weekly slice

  // KŌENKAI TIER-1 SURVIVAL FLOOR (Constitution §A6 & C2.4):
  // Guarantees minimum base funding that covers staff/roster costs for new heya
  // without sekitori. Formula: (5 * ¥2000) + (3 * ¥6000) = ¥28,000.
  const KOENKAI_SURVIVAL_FLOOR = 28_000; 
  const effectiveIncome = Math.max(supporterIncome, KOENKAI_SURVIVAL_FLOOR);

  // If a stable is deeply unprofitable, overhead (Oyakata salary, recruitment) is paused
  // to prevent instant insolvency, but base roster costs must always be paid.
  let effectiveBurn = totalBurn;
  if (effectiveIncome < totalBurn && effectiveIncome <= KOENKAI_SURVIVAL_FLOOR) {
      effectiveBurn = Math.max(baseBurn, effectiveIncome);
  } else if (effectiveIncome < totalBurn) {
      // Can afford some overhead but not all
      effectiveBurn = effectiveIncome; 
  }

  // 3. Apply to Funds
  const net = effectiveIncome - effectiveBurn;
  heya.funds += net;

  // 4. Runway calculation
  const monthlyBurn = totalBurn * 4;
  const runwayMonths = monthlyBurn > 0 ? heya.funds / monthlyBurn : 999;

  // 5. Solvency Check (Bankruptcy)
  if (heya.funds < 0) {
    handleInsolvency(heya, world);
    EventBus.financialAlert(world, heya.id, "Financial distress", `${heya.name ?? heya.id} is running a deficit.`, { funds: heya.funds, runwayMonths: Math.floor(runwayMonths) });
  }

  // 6. Update Financial Risk Indicator
  heya.riskIndicators.financial = heya.funds < 0 || (runwayMonths < 2);
}

/**
 * Handle insolvency.
 *  * @param heya - The Heya.
 *  * @param world - The World.
 */
function handleInsolvency(heya: Heya, world: WorldState): void {
  // If funds are negative, we are in trouble.
  // The JSA (Governance) steps in if it gets too deep.
  
  const DEBT_LIMIT = -20_000_000; // 20m Yen debt limit

  if (heya.funds < DEBT_LIMIT) {
    // 1. Attempt Benefactor Bailout (Constitution Addendum D.4)
    const pool = world.sponsorPool;
    const koenkai = pool?.koenkais.get(`koenkai_${heya.id}`);
    const rng = RNGRegistry.getSystemRNG(world, "economics", `bailout-${heya.id}-${world.dayIndexGlobal}`);
    
    const benefactor = pool ? selectBenefactor(heya.id, pool, koenkai, rng) : null;
    
    if (benefactor) {
      const bailoutAmount = 10_000_000; // Standard Pillar bailout
      heya.funds += bailoutAmount;
      
      EventBus.financialAlert(world, heya.id, 
        "Benefactor Bailout", 
        `${benefactor.displayName} has provided a ¥10M emergency infusion to stabilize ${heya.name}.`,
        { benefactorId: benefactor.sponsorId, amount: bailoutAmount }
      );
    } else if (heya.governanceStatus !== "sanctioned") {
      // 2. Regular Governance Scandal for Insolvency
      reportScandal(world, heya.id, "major", "Severe Insolvency / Debt Limit Breach");
      
      // Cap debt so math doesn't spiral into infinity
      heya.funds = DEBT_LIMIT; 
    }
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
  
  // 1. Determine Kensho count (Envelopes) per User Spec
  // 2. Award Windfalls (v2 Spec)
  // 1. Determine Kensho count (Envelopes) per User Spec (Phase 3.2: Media Connectivity)
  const kenshoRng = RNGRegistry.getSystemRNG(world, "kensho", `kensho-${winner.id}-${world.dayIndexGlobal}`);
  const kenshoCount = calculateKenshoEnvelopes(world, winner, result.awardFact ?? undefined, kenshoRng);
  result.kenshoEnvelopes = kenshoCount;
  // 2. Marketability Shift (Permanent)
  if (!winner.stats) {
     winner.stats = { strength: 50, technique: 50, speed: 50, weight: 150, stamina: 50, mental: 50, adaptability: 50, balance: 50, achievements: { kinboshiEarned: 0, ginboshiEarned: 0, kinboshiConceded: 0, ginboshiConceded: 0, specialPrizes: { shukunSho: 0, kantoSho: 0, ginoSho: 0 } } };
  }
  
  const marketabilityScale = result.awardFact === 'kinboshi' ? 5 : result.awardFact === 'ginboshi' ? 2 : 0;
  if (marketabilityScale > 0) {
    if ((winner as any).marketability === undefined) (winner as any).marketability = 50;
    (winner as any).marketability += marketabilityScale;
    
    // Also sync with popularity (presentation layer)
    winner.economics.popularity = Math.min(100, winner.economics.popularity + (marketabilityScale * 2));
  }

  if (kenshoCount > 0 && winnerHeya) {
    // Constitution: ¥70,000 per banner
    const AMOUNT_PER_KENSHO = 70_000;
    const total = kenshoCount * AMOUNT_PER_KENSHO;

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

    // Emit kensho event
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

/**
 * Compute star power.
 *  * @param heya - The Heya.
 *  * @param world - The World.
 *  * @returns The result.
 */
  return Math.min(100, starPower);
}