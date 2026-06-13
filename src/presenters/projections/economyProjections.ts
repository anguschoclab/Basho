/**
 * economyProjections.ts
 *
 * Projections for loan status and merger warnings.
 * Extracted from uiDigest.ts to eliminate monolithic structure.
 */

import type { WorldState } from "../../engine/types/world";
import { EntityCollection } from "../../engine/core/EntityCollection";

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
 * Project a list of heyas at risk of merger based on debt + small roster.
 */
export function projectMergerWarnings(world: WorldState) {
  const warnings: Array<{
    heyaId: string;
    heyaName: string;
    funds: number;
    rosterSize: number;
    governanceStatus: string;
  }> = [];

  for (const h of EntityCollection.getHeyas(world)) {
    const isInDebt = h.funds < 0;
    const rosterSize = h.rikishiIds?.length ?? 0;
    if (isInDebt && rosterSize <= 3) {
      warnings.push({
        heyaId: h.id,
        heyaName: h.name,
        funds: h.funds,
        rosterSize,
        governanceStatus: h.governanceStatus,
      });
    }
  }

  return warnings.sort((a, b) => a.funds - b.funds);
}
