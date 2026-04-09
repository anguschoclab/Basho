/**
 * phase01_economy.ts
 * ==================
 * Pipeline Phase 1 — Finances, Upkeep, Sponsor Payouts
 *
 * Execution order:
 *   1. Process kōenkai / sponsor stipend income per heya
 *   2. Deduct facility maintenance + staff upkeep
 *   3. Deduct rikishi salaries (weekly slice of monthly rate)
 *   4. Apply net to heya.funds
 *   5. Record aggregate revenue / expenses in transientContext.deltas
 *
 * Phase 2 reads the resulting balance to derive financialPenalty.
 * This phase must run BEFORE phase02_context.
 */

import type { WorldState } from "../../types/world";
import type { Heya } from "../../types/heya";
import { RANK_HIERARCHY } from "../../banzuke";
import { calculateKoenkaiIncome } from "../../systems/economics/SponsorshipService";
import { getHeyaStaffBonuses } from "../../staff";
import { emptyDeltas, defaultActiveModifiers } from "../pipelineRunner";
// NOTE: Extreme insolvency (debt limit / benefactor bailout) is handled by
// economics.handleInsolvency(), called from governanceReview.ts post-pipeline.
import {
  OYAKATA_SALARY_MONTHLY,
  RECRUITMENT_BUDGET_WEEKLY,
  NON_SEKITORI_ALLOWANCE,
  KOENKAI_SURVIVAL_FLOOR,
  FACILITY_UPKEEP,
  STAFF_UPKEEP_PER_MEMBER,
} from "../../constants/EconomicConstants";

// ── Phase ─────────────────────────────────────────────────────────────────────

export function phase01_economy(world: WorldState): WorldState {
  let totalRevenue = 0;
  let totalExpenses = 0;

  // Clone heya map — each heya funds value will be updated immutably
  const nextHeyas = new Map(world.heyas);

  for (const [id, heya] of world.heyas) {
    const { revenue, expenses, nextFunds } = processHeyaFinances(heya, world);
    totalRevenue += revenue;
    totalExpenses += expenses;
    nextHeyas.set(id, { ...heya, funds: nextFunds });
  }

  // Initialise / update transientContext with fresh deltas from this phase
  const existingCtx = world.transientContext;
  const deltas = {
    ...(existingCtx?.deltas ?? emptyDeltas()),
    revenue: totalRevenue,
    expenses: totalExpenses,
  };

  return {
    ...world,
    heyas: nextHeyas,
    transientContext: {
      activeModifiers: existingCtx?.activeModifiers ?? defaultActiveModifiers(),
      deltas,
    },
  };
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function processHeyaFinances(
  heya: Heya,
  world: WorldState,
): { revenue: number; expenses: number; nextFunds: number } {
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

  const oyakataCost = OYAKATA_SALARY_MONTHLY / 4;

  const baseBurn = rikishiSalaries + facilityUpkeep + staffUpkeep;

  const totalBurn = baseBurn + oyakataCost + RECRUITMENT_BUDGET_WEEKLY;

  // Solvency: overhead is paused at the survival floor
  let effectiveBurn = totalBurn;
  if (effectiveIncome < totalBurn && effectiveIncome <= KOENKAI_SURVIVAL_FLOOR) {
    effectiveBurn = Math.max(baseBurn, effectiveIncome);
  } else if (effectiveIncome < totalBurn) {
    effectiveBurn = effectiveIncome;
  }

  const net = effectiveIncome - effectiveBurn;
  const nextFunds = heya.funds + net;

  return {
    revenue: effectiveIncome,
    expenses: effectiveBurn,
    nextFunds,
  };
}
