// economics.ts
// Institutional Economy & Finance Engine
// Manages Money, Solvency, Salaries, and Support.
// Aligned with Institutional Economy V2.0 Spec.

import { rngFromSeed, rngForWorld } from "./rng";
import { SeededRNG } from "./utils/SeededRNG";
import type { WorldState, Heya, BoutResult, MatchSchedule, Rikishi, Id } from "./types";
import { reportScandal } from "./governance";
import { RANK_HIERARCHY } from "./banzuke"; // Need salary data

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

function processHeyaFinances(heya: Heya, world: WorldState): void {
  // 1. Calculate Expenses (Weekly Burn)
  
  // A. Rikishi Salaries (Monthly -> Weekly approx)
  let rikishiSalaries = 0;
  for (const rId of heya.rikishiIds) {
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
  const facilityUpkeep = 
    (heya.facilities.training * 1000) + 
    (heya.facilities.recovery * 1000) + 
    (heya.facilities.nutrition * 2000); // Food is expensive!

  // C. Oyakata Salary
  const oyakataCost = OYAKATA_SALARY_MONTHLY / 4;

  const totalBurn = rikishiSalaries + facilityUpkeep + oyakataCost + RECRUITMENT_BUDGET_WEEKLY;

  // 2. Calculate Income (Koenkai / Supporters)
  // Income is derived from Reputation (Prestige)
  // High reputation = strong supporters
  const supporterIncome = (heya.reputation || 10) * SUPPORTER_INCOME_FACTOR;

  // 3. Apply to Funds
  const net = supporterIncome - totalBurn;
  heya.funds += net;

  // 4. Solvency Check (Bankruptcy)
  if (heya.funds < 0) {
    handleInsolvency(heya, world);
  }

  // 5. Update Financial Risk Indicator
  // Risk if runway < 8 weeks
  const runwayWeeks = totalBurn > 0 ? heya.funds / totalBurn : 999;
  heya.riskIndicators.financial = heya.funds < 0 || runwayWeeks < 8;
}

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
 */
export function onBoutResolved(
  world: WorldState,
  context: { match: BashoMatch; result: BoutResult; east: Rikishi; west: Rikishi }
): void {
  const { result, east, west } = context;
  
  
  const rng = rngForWorld(world, "kensho", `${context.match?.id ?? context.match?.day ?? "bout"}::${east.id}::${west.id}`);
// Only Makuuchi bouts generate Kensho normally
  if (east.division !== "makuuchi") return;

  // Simple stochastic kensho for now (random 0-5 envelopes for top ranks)
  // In full sim, this would be based on popularity matchups.
  // We'll give a small chance of Kensho.
  
  const winner = result.winner === "east" ? east : west;
  const winnerHeya = world.heyas.get(winner.heyaId);

  // Determine Kensho count based on rank
  let kenshoCount = 0;
  if (east.rank === "yokozuna" || west.rank === "yokozuna") kenshoCount += 5;
  else if (east.rank === "ozeki" || west.rank === "ozeki") kenshoCount += 2;
  
  // Random variance
  if (rng.bool(0.5)) kenshoCount += 1;

  if (kenshoCount > 0 && winnerHeya) {
    const AMOUNT_PER_KENSHO = 62_000; // Real value approx
    const total = kenshoCount * AMOUNT_PER_KENSHO;

    // Split: 50% to Rikishi Cash (Taxed/Saved), 50% to Stable (Operating Revenue)?
    // Canon: Kensho belongs to the Rikishi, but Stable takes a cut or 'management fee'?
    // Actually, Spec 11.0 says: "RikishiCash... StableFunds".
    // Usually Rikishi keeps Kensho. Stable survives on Koenkai.
    // However, to make the game fun, let's say Stable takes a small admin fee (10%)
    
    const rikishiShare = total * 0.9;
    const stableShare = total * 0.1;

    // Update Rikishi Economics
    if (!winner.economics) winner.economics = { cash: 0, retirementFund: 0, careerKenshoWon: 0, kinboshiCount: 0, totalEarnings: 0, currentBashoEarnings: 0, popularity: 50 };
    
    winner.economics.cash += rikishiShare;
    winner.economics.currentBashoEarnings += rikishiShare;
    winner.economics.careerKenshoWon += kenshoCount;

    // Update Stable Funds
    winnerHeya.funds += stableShare;
  }
}