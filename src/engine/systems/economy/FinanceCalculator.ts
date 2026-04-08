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
import { RANK_HIERARCHY } from "../../banzuke";
import { calculateKoenkaiIncome } from "../economics/SponsorshipService";
import {
  OYAKATA_SALARY_MONTHLY,
  RECRUITMENT_BUDGET_WEEKLY,
  NON_SEKITORI_ALLOWANCE,
  KOENKAI_SURVIVAL_FLOOR,
  FACILITY_UPKEEP,
  STAFF_UPKEEP_PER_MEMBER,
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
export function calculateHeyaWeeklyFinances(
  heya: Heya,
  world: WorldState,
): HeyaFinanceResult {
  // --- Income ---
  const monthlyKoenkai = calculateKoenkaiIncome(heya.koenkaiBand ?? "none");
  const weeklyKoenkai = monthlyKoenkai / 4;
  const effectiveIncome = Math.max(weeklyKoenkai, KOENKAI_SURVIVAL_FLOOR);

  // --- Expenses ---
  let rikishiSalaries = 0;
  for (const rId of heya.rikishiIds ?? []) {
    const r = world.rikishi.get(rId);
    if (!r) continue;
    const info = RANK_HIERARCHY[r.rank];
    rikishiSalaries += info?.isSekitori
      ? (info.salary ?? 0) / 4
      : NON_SEKITORI_ALLOWANCE;
  }

  const facilityUpkeep = heya.facilities
    ? heya.facilities.training * FACILITY_UPKEEP.training +
      heya.facilities.recovery * FACILITY_UPKEEP.recovery +
      heya.facilities.nutrition * FACILITY_UPKEEP.nutrition
    : 0;

  const staffUpkeep = (heya.staffIds?.length ?? 0) * STAFF_UPKEEP_PER_MEMBER;
  const oyakataCost = OYAKATA_SALARY_MONTHLY / 4;

  const baseBurn = rikishiSalaries + facilityUpkeep + staffUpkeep;
  const totalBurn = baseBurn + oyakataCost + RECRUITMENT_BUDGET_WEEKLY;

  // Solvency clamping: pause overhead at the survival floor
  let effectiveBurn = totalBurn;
  if (effectiveIncome < totalBurn && effectiveIncome <= KOENKAI_SURVIVAL_FLOOR) {
    effectiveBurn = Math.max(baseBurn, effectiveIncome);
  } else if (effectiveIncome < totalBurn) {
    effectiveBurn = effectiveIncome;
  }

  const net = effectiveIncome - effectiveBurn;
  const nextFunds = heya.funds + net;
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
