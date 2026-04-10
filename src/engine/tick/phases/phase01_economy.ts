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
import { calculateHeyaWeeklyFinances } from "../../systems/economy/FinanceCalculator";
import { emptyDeltas, defaultActiveModifiers } from "../pipelineRunner";
// NOTE: Extreme insolvency (debt limit / benefactor bailout) is handled by
// economics.handleInsolvency(), called from governanceReview.ts post-pipeline.

// ── Phase ─────────────────────────────────────────────────────────────────────

export function phase01_economy(world: WorldState): WorldState {
  let totalRevenue = 0;
  let totalExpenses = 0;

  // Clone heya map — each heya funds value will be updated immutably
  const nextHeyas = new Map(world.heyas);

  for (const [id, heya] of world.heyas) {
    const { revenue, expenses, nextFunds } = calculateHeyaWeeklyFinances(heya, world);
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

