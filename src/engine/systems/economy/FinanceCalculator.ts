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
import { getRikishi } from "../../queries";
import { calculateKoenkaiIncome, SPONSOR_TIER_INCOME } from "./SponsorshipService";
import { getHeyaStaffBonuses } from "../../staff";
import {
  RECRUITMENT_BUDGET_WEEKLY,
  FACILITY_UPKEEP,
  STAFF_UPKEEP_PER_MEMBER,
  JSA_PER_WRESTLER_SUBSIDY_MONTHLY,
  JSA_STABLE_WEEKLY_GRANT,
  KOENKAI_INCOME_SPLIT,
  OYAKATA_SALARY_MONTHLY,
  DEBT_LIMIT,
  RUNWAY_INFINITE_SENTINEL,
  FIXED_OPERATING_OVERHEAD_WEEKLY,
} from "../../../constants/engine/economic";

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
 *
 * Algorithm:
 * 1. Calculate income from koenkai, JSA subsidies, sponsor tiers, and base grants
 * 2. Calculate expenses from facilities, staff, and recruitment
 * 3. Apply administration discount from staff bonuses
 * 4. Apply solvency clamping to prevent debt spirals
 * 5. Calculate net change and apply debt floor
 * 6. Compute runway in months
 *
 * @param {Heya} heya - The heya to calculate finances for.
 * @param {WorldState} world - The world state for sponsor and staff data.
 * @returns {HeyaFinanceResult} The calculated finance result.
 *
 * @example
 * ```ts
 * const result = calculateHeyaWeeklyFinances(heya, world);
 * console.log(`Revenue: ${result.revenue}, Expenses: ${result.expenses}`);
 * console.log(`Runway: ${result.runwayMonths} months`);
 * ```
 */
export function calculateHeyaWeeklyFinances(heya: Heya, world: WorldState): HeyaFinanceResult {
  // --- Income ---
  const monthlyKoenkai = calculateKoenkaiIncome(heya.koenkaiBand ?? "none");
  // Only count heya portion (70%) - sekitori portion (30%) is distributed separately
  const weeklyKoenkai = (monthlyKoenkai * KOENKAI_INCOME_SPLIT.heyaPortion) / 4;

  // JSA per-wrestler subsidy (primary stable income from JSA) — keyed by rank
  let monthlyJsaSubsidy = 0;
  for (const rId of heya.rikishiIds ?? []) {
    const r = getRikishi(world, rId);
    if (!r) continue;
    const subsidy =
      JSA_PER_WRESTLER_SUBSIDY_MONTHLY[r.rank as keyof typeof JSA_PER_WRESTLER_SUBSIDY_MONTHLY] ||
      0;
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

  // JSA base operational grant (all stables, every week)
  const jsaBaseGrant = JSA_STABLE_WEEKLY_GRANT;

  // Oyakata salary as heya income (real-world JSA model)
  const weeklyOyakataSalary = OYAKATA_SALARY_MONTHLY / 4;

  // Safety nets removed: no maintenance subsidy, no koenkai survival floor
  const effectiveIncome =
    weeklyKoenkai + weeklyJsaSubsidy + weeklySponsorTierIncome + jsaBaseGrant + weeklyOyakataSalary;

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

  // Apply administration discount (Administrator role)
  const facilityUpkeep = facilityUpkeepRaw * staffBonuses.administration;
  const staffUpkeep = staffUpkeepRaw * staffBonuses.administration;

  // Food is charged daily by phase01_daily_economy — do not double-count here.
  // Fixed operating overhead is an unavoidable heya expense (NOT subject to admin discount)
  // and is exempt from the solvency clamp — net can go negative for thin-income stables.
  const baseBurn = facilityUpkeep + staffUpkeep + FIXED_OPERATING_OVERHEAD_WEEKLY;
  const recruitmentCost = heya.funds <= DEBT_LIMIT ? 0 : RECRUITMENT_BUDGET_WEEKLY;
  const totalBurn = baseBurn + recruitmentCost;

  // Solvency clamping: only the DISCRETIONARY recruitment cost is clamped away when
  // income is insufficient. baseBurn (facilities + staff + fixed overhead) is always
  // paid in full, even when net goes negative — this is what allows weak stables to
  // sink toward LOAN_ISSUANCE_THRESHOLD / MERGER_THRESHOLD.
  let effectiveBurn = totalBurn;
  if (effectiveIncome < totalBurn) {
    // Income can't cover everything — skip discretionary recruitment, pay baseBurn only.
    effectiveBurn = baseBurn;
  }

  const net = effectiveIncome - effectiveBurn;
  let nextFunds = heya.funds + net;

  // Strict Debt Floor (Inlined to prevent import failures)
  // DEBT_LIMIT = -15,500,000 as per EconomicConstants.ts
  if (nextFunds < DEBT_LIMIT) {
    nextFunds = DEBT_LIMIT;
  }

  const monthlyBurn = totalBurn * 4;
  const runwayMonths = monthlyBurn > 0 ? heya.funds / monthlyBurn : RUNWAY_INFINITE_SENTINEL;

  return {
    revenue: effectiveIncome,
    expenses: effectiveBurn,
    totalBurn,
    runwayMonths,
    nextFunds,
  };
}
