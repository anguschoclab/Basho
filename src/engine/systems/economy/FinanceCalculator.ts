/**
 * FinanceCalculator.ts
 * ====================
 * Pure financial calculation for a single heya's weekly finances.
 *
 * Both economics.ts (weekly mutating tick) and phase01_economy.ts
 * (immutable pipeline phase) delegate to this shared implementation.
 * No side effects — returns computed values only.
 */

import type { WorldState } from "../../types/world";
import type { Heya } from "../../types/heya";
import { calculateKoenkaiIncome, SPONSOR_TIER_INCOME } from "../economics/SponsorshipService";
import { getHeyaStaffBonuses } from "../../staff";
import {
  RECRUITMENT_BUDGET_WEEKLY,
  KOENKAI_SURVIVAL_FLOOR,
  FACILITY_UPKEEP,
  STAFF_UPKEEP_PER_MEMBER,
  clampFundsToDebtLimit,
  JSA_PER_WRESTLER_SUBSIDY_MONTHLY,
  DIET_COSTS,
  KOENKAI_INCOME_SPLIT,
} from "../../constants/EconomicConstants";

export interface HeyaFinanceResult {
  /** Effective weekly income after survival floor. */
  revenue: number;
  /** Effective weekly expenses after solvency clamping. */
  expenses: number;
  /** Theoretical total burn (before solvency adjustment). */
  totalBurn: number;
  /** Runway in months at current burn rate (999 if no burn). */
  runwayMonths: number;
  /** New funds after applying net (heya.funds + net). */
  nextFunds: number;
}

/**
 * Compute weekly income, expenses, and resulting funds for a heya.
 * Pure — never reads or writes world state beyond the provided heya.
 */
export function calculateHeyaWeeklyFinances(heya: Heya, world: WorldState): HeyaFinanceResult {
  // --- Income ---
  const monthlyKoenkai = calculateKoenkaiIncome(heya.koenkaiBand ?? "none");
  // Only count heya portion (70%) - sekitori portion (30%) is distributed separately
  const weeklyKoenkai = (monthlyKoenkai * KOENKAI_INCOME_SPLIT.heyaPortion) / 4;

  // JSA per-wrestler subsidy (primary stable income from JSA)
  let monthlyJsaSubsidy = 0;
  for (const rId of heya.rikishiIds ?? []) {
    const r = world.rikishi.get(rId);
    if (!r) continue;
    const subsidy =
      JSA_PER_WRESTLER_SUBSIDY_MONTHLY[
        r.division as keyof typeof JSA_PER_WRESTLER_SUBSIDY_MONTHLY
      ] || 0;
    monthlyJsaSubsidy += subsidy;
  }
  const weeklyJsaSubsidy = monthlyJsaSubsidy / 4;

  // Add sponsor tier income (from all sponsors in koenkai)
  let monthlySponsorTierIncome = 0;
  const koenkai = world.sponsorPool?.koenkais?.get(heya.koenkaiId ?? "");
  if (koenkai) {
    for (const member of koenkai.members) {
      const sponsor = world.sponsorPool?.sponsors.get(member.sponsorId);
      if (sponsor) {
        monthlySponsorTierIncome += SPONSOR_TIER_INCOME[sponsor.tier] || 0;
      }
    }
  }
  const weeklySponsorTierIncome = monthlySponsorTierIncome / 4;

  // JSA Maintenance Subsidy (Safety Net for insolvent stables)
  const maintenanceSubsidy = heya.funds < 0 ? 500_000 : 0;

  const effectiveIncome = Math.max(
    weeklyKoenkai + weeklyJsaSubsidy + weeklySponsorTierIncome + maintenanceSubsidy,
    KOENKAI_SURVIVAL_FLOOR
  );

  // --- Expenses ---
  // NOTE: Sekitori salaries are now paid by JSA directly to rikishi (not heya expense)
  // NOTE: Oyakata salary is now paid by JSA directly (not heya expense)
  // NOTE: Non-sekitori allowance is replaced by basho teate (paid by JSA per tournament)

  const staffBonuses = getHeyaStaffBonuses(world, heya.id);

  const facilityUpkeepRaw = heya.facilities
    ? heya.facilities.training * FACILITY_UPKEEP.training +
      heya.facilities.recovery * FACILITY_UPKEEP.recovery +
      heya.facilities.nutrition * FACILITY_UPKEEP.nutrition
    : 0;

  const staffUpkeepRaw = (heya.staffIds?.length ?? 0) * STAFF_UPKEEP_PER_MEMBER;

  // Food costs based on rikishi diet regimens
  let weeklyFoodCost = 0;
  for (const rId of heya.rikishiIds ?? []) {
    const r = world.rikishi.get(rId);
    if (!r) continue;
    // Default to maintenance diet if not specified
    const diet =
      ((r as unknown as Record<string, unknown>).diet as string | undefined) || "maintenance";
    const dailyCost = DIET_COSTS[diet] || DIET_COSTS.maintenance;
    weeklyFoodCost += dailyCost * 7;
  }

  // Apply administration discount (Administrator role)
  const facilityUpkeep = facilityUpkeepRaw * staffBonuses.administration;
  const staffUpkeep = staffUpkeepRaw * staffBonuses.administration;

  const baseBurn = facilityUpkeep + staffUpkeep + weeklyFoodCost;
  const recruitmentCost = heya.funds <= -20_000_000 ? 0 : RECRUITMENT_BUDGET_WEEKLY;
  const totalBurn = baseBurn + recruitmentCost;

  // Solvency clamping: pause overhead at the survival floor
  let effectiveBurn = totalBurn;
  if (effectiveIncome < totalBurn) {
    // If income is below total burn, cap burn at income to prevent debt spirals
    // But never reduce below baseBurn (essential operations only)
    effectiveBurn = Math.max(baseBurn, Math.min(effectiveIncome, totalBurn));
  }

  const net = effectiveIncome - effectiveBurn;
  let nextFunds = heya.funds + net;

  // Strict Debt Floor (Inlined to prevent import failures)
  // DEBT_LIMIT = -20,000,000 as per EconomicConstants.ts
  if (nextFunds < -20_000_000) {
    nextFunds = -20_000_000;
  }

  const monthlyBurn = totalBurn * 4;
  const runwayMonths = monthlyBurn > 0 ? heya.funds / monthlyBurn : 999;

  return {
    revenue: effectiveIncome,
    expenses: effectiveBurn,
    totalBurn,
    runwayMonths,
    nextFunds,
  };
}
