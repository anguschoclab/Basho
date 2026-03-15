// economics.ts
// Institutional Economy & Finance Engine
// Manages Money, Solvency, Salaries, and Support.
// Aligned with Institutional Economy V2.0 Spec.

import { rngFromSeed, rngForWorld, SeededRNG } from "./rng";
import type { WorldState } from "./types/world";
import type { Heya } from "./types/heya";
import type { BoutResult, MatchSchedule } from "./types/basho";
import type { Rikishi } from "./types/rikishi";
import type { Id } from "./types/common";
import { reportScandal } from "./governance";
import { RANK_HIERARCHY } from "./banzuke";
import { EventBus } from "./events";

// === CONSTANTS ===

const BASE_FACILITY_COST = 50_000; // Base weekly upkeep per facility point
const OYAKATA_SALARY_MONTHLY = 1_200_000; // Standard salary
const RECRUITMENT_BUDGET_WEEKLY = 100_000; // Baseline scouting burn

// Reputation -> Weekly Supporter Income Multiplier
// e.g. Rep 50 = 50 * 10,000 = 500,000 / week approx? 
// Let's align with Spec: "Supporters sustain the stable."
const SUPPORTER_INCOME_FACTOR = 15_000; 

// === CORE LOGIC ===

/**
 * Process weekly economic updates.
 * - Deduct burn (Salaries, Facilities)
 * - Add income (Koenkai)
 * - Check Solvency
 */
export function tickWeek(world: WorldState): void {
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

  // C. Oyakata Salary
  const oyakataCost = OYAKATA_SALARY_MONTHLY / 4;

  const totalBurn = rikishiSalaries + facilityUpkeep + oyakataCost + RECRUITMENT_BUDGET_WEEKLY;

  // 2. Calculate Income (Koenkai / Supporters)
  const supporterIncome = (heya.reputation || 10) * SUPPORTER_INCOME_FACTOR;

  // KŌENKAI TIER-1 SURVIVAL FLOOR (Constitution §A6):
  // Guarantees minimum base funding that covers staff/roster costs for new heya
  // without sekitori. Prevents instant insolvency.
  const KOENKAI_SURVIVAL_FLOOR = 350_000; // Covers basic roster + minimal facilities
  const effectiveIncome = Math.max(supporterIncome, KOENKAI_SURVIVAL_FLOOR);

  // 3. Apply to Funds
  const net = effectiveIncome - totalBurn;
  heya.funds += net;

  // 4. Runway calculation
  const runwayWeeks = totalBurn > 0 ? heya.funds / totalBurn : 999;

  // 5. Solvency Check (Bankruptcy)
  if (heya.funds < 0) {
    handleInsolvency(heya, world);
    EventBus.financialAlert(world, heya.id, "Financial distress", `${heya.name ?? heya.id} is running a deficit.`, { funds: heya.funds, runwayWeeks: Math.floor(runwayWeeks) });
  }

  // 6. Update Financial Risk Indicator
  heya.riskIndicators.financial = heya.funds < 0 || runwayWeeks < 8;
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
    // Report a Governance Scandal for Insolvency
    // Only report if not already Sanctioned to avoid spamming
    if (heya.governanceStatus !== "sanctioned") {
      reportScandal(world, heya.id, "major", "Severe Insolvency / Debt Limit Breach");
      
      // Emergency Bailout (Narrative hook)
      // Reset to 0 but take massive scandal hit? 
      // For now, just cap debt so math doesn't break, but scandal keeps rising.
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
export function onBoutResolved(
  world: WorldState,
  context: { match: MatchSchedule; result: BoutResult; east: Rikishi; west: Rikishi }
): void {
  const { result, east, west } = context;
  
  const rng = rngForWorld(world, "kensho", `${context.match?.day ?? "bout"}::${east.id}::${west.id}`);
  // Only Makuuchi bouts generate Kensho normally
  if (east.division !== "makuuchi") return;

  const winner = result.winner === "east" ? east : west;
  const winnerHeya = world.heyas.get(winner.heyaId);

  // Determine Kensho count based on rank + popularity
  let kenshoCount = 0;
  if (east.rank === "yokozuna" || west.rank === "yokozuna") kenshoCount += 5;
  else if (east.rank === "ozeki" || west.rank === "ozeki") kenshoCount += 2;
  
  // Random variance
  if (rng.bool(0.5)) kenshoCount += 1;

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

    if (!winner.economics) winner.economics = { cash: 0, retirementFund: 0, careerKenshoWon: 0, kinboshiCount: 0, totalEarnings: 0, currentBashoEarnings: 0, popularity: 50 };
    
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
 * Each sponsor computes satisfaction; those below threshold churn out.
 */
export function runSponsorChurn(world: WorldState): { churned: string[]; retained: number } {
  const pool = world.sponsorPool;
  if (!pool?.sponsors) return { churned: [], retained: 0 };

  const churned: string[] = [];
  let retained = 0;

  for (const heya of world.heyas.values()) {
    const koenkaiId = `koenkai_${heya.id}`;
    const koenkai = pool.koenkais?.get(koenkaiId);
    if (!koenkai) continue;

    // Compute heya satisfaction inputs (banded per fog-of-war)
    const prestigeScore = heya.reputation ?? 50;
    const starPower = computeStarPower(heya, world);
    const scandalSeverity = heya.scandalScore ?? 0;

    // Satisfaction = (Prestige × 0.5) + (StarPower × 0.3) - (ScandalSeverity × 20)
    const satisfaction = (prestigeScore * 0.5) + (starPower * 0.3) - (scandalSeverity * 0.2);

    // Check each kōenkai member
    const survivingMembers = koenkai.members.filter((rel: any) => {
      const sponsor = pool.sponsors.get(rel.sponsorId);
      if (!sponsor || !sponsor.active) return false;

      // Churn thresholds per Addendum D2
      const isLocal = sponsor.category === "local_business";
      const isCorporate = sponsor.category === "regional_corporation" || sponsor.category === "national_brand";
      const threshold = isLocal ? 20 : isCorporate ? 50 : 70;

      if (satisfaction < threshold) {
        sponsor.active = false;
        churned.push(sponsor.displayName);

        EventBus.financialAlert(world, heya.id,
          "Sponsor departure",
          `${sponsor.displayName} has withdrawn support from ${heya.name}.`,
          { sponsorId: sponsor.sponsorId, satisfaction: Math.round(satisfaction) }
        );
        return false;
      }
      retained++;
      return true;
    });

    koenkai.members = survivingMembers;

    // Update kōenkai band based on remaining members
    const memberCount = survivingMembers.length;
    const hasPillar = survivingMembers.some((m: any) => m.role === "koenkai_pillar");
    if (memberCount === 0) heya.koenkaiBand = "none";
    else if (memberCount <= 2 && !hasPillar) heya.koenkaiBand = "weak";
    else if (memberCount <= 4) heya.koenkaiBand = "moderate";
    else if (memberCount <= 6 || !hasPillar) heya.koenkaiBand = "strong";
    else heya.koenkaiBand = "powerful";
  }

  return { churned, retained };
}

/**
 * Compute star power.
 *  * @param heya - The Heya.
 *  * @param world - The World.
 *  * @returns The result.
 */
function computeStarPower(heya: Heya, world: WorldState): number {
  let starPower = 0;
  for (const rId of (heya.rikishiIds || [])) {
    const r = world.rikishi.get(rId);
    if (!r) continue;
    if (r.rank === "yokozuna") starPower += 30;
    else if (r.rank === "ozeki") starPower += 20;
    else if (r.rank === "sekiwake" || r.rank === "komusubi") starPower += 10;
    else if (r.division === "makuuchi") starPower += 5;
  }
  return Math.min(100, starPower);
}