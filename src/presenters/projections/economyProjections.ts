/**
 * economyProjections.ts
 *
 * Projections for loan status and merger warnings.
 * Extracted from uiDigest.ts to eliminate monolithic structure.
 */

import type { WorldState } from "../../engine/types/world";
import { EntityCollection } from "../../engine/core/EntityCollection";
import {
  CHRONIC_UNDERPERFORMANCE_BASHO,
  PRESTIGE_COLLAPSE_BAND,
  NON_FINANCIAL_MERGER_MAX_ROSTER,
} from "../../constants/engine/economic";

/**
 * Project the current loan status for a heya.
 * Returns null when the heya has no active loans.
 */
export function projectLoanStatus(world: WorldState, heyaId: string) {
  const heya = world.heyas.get(heyaId);
  if (!heya || !heya.activeLoans?.length) return null;

  const loans = heya.activeLoans;
  let totalBalance = 0;
  let totalMonthlyPayment = 0;
  let isOverdue = false;
  let overdueCount = 0;
  const loanList = [];
  for (const l of loans) {
    totalBalance += l.remainingBalance;
    totalMonthlyPayment += l.monthlyPayment;
    if (l.remainingBalance > l.principal) {
      isOverdue = true;
      overdueCount++;
    }
    loanList.push({
      id: l.id,
      type: l.type,
      providerName: l.providerName,
      remainingBalance: l.remainingBalance,
      monthlyPayment: l.monthlyPayment,
      interestRate: l.interestRate,
    });
  }

  return {
    loanCount: loans.length,
    totalBalance,
    totalMonthlyPayment,
    isOverdue,
    overdueCount,
    loans: loanList,
  };
}

/**
 * Project a list of heyas at risk of merger based on debt + small roster
 * or chronic underperformance + prestige collapse.
 */
export function projectMergerWarnings(world: WorldState) {
  const warnings: Array<{
    heyaId: string;
    heyaName: string;
    funds: number;
    rosterSize: number;
    governanceStatus: string;
    warningType: "financial" | "non_financial";
  }> = [];

  for (const h of EntityCollection.getHeyas(world)) {
    const isInDebt = h.funds < 0;
    const rosterSize = h.rikishiIds?.length ?? 0;

    // Financial merger warning: debt + small roster
    if (isInDebt && rosterSize <= 3) {
      warnings.push({
        heyaId: h.id,
        heyaName: h.name,
        funds: h.funds,
        rosterSize,
        governanceStatus: h.governanceStatus,
        warningType: "financial",
      });
    }

    // Non-financial merger warning: chronic underperformance + prestige collapse
    if (
      (h.consecutiveUnderperformanceBasho ?? 0) >= CHRONIC_UNDERPERFORMANCE_BASHO &&
      h.prestigeBand === PRESTIGE_COLLAPSE_BAND &&
      rosterSize <= NON_FINANCIAL_MERGER_MAX_ROSTER &&
      !isInDebt
    ) {
      warnings.push({
        heyaId: h.id,
        heyaName: h.name,
        funds: h.funds,
        rosterSize,
        governanceStatus: h.governanceStatus,
        warningType: "non_financial",
      });
    }
  }

  return warnings.sort((a, b) => a.funds - b.funds);
}
