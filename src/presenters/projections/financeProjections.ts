/**
 * financeProjections.ts
 *
 * Full finance summary projection for the Finance page and Dashboard.
 * Extracts the inline useMemo calculations from EconomyPage into a reusable presenter.
 */

import type { WorldState } from "@/engine/types/world";
import { calculateHeyaWeeklyFinances } from "@/engine/economy/FinanceCalculator";
import { calculateKoenkaiIncome } from "@/engine/economy/SponsorshipService";
import { getPlayerHeya } from "@/engine/core/queries";
import { KOENKAI_INCOME_SPLIT } from "@/constants/engine/economic";
import { formatYen } from "@/lib/engineUtils";
import type { RunwayBand } from "@/engine/types/narrative";
export type { RunwayBand };

export interface FinanceSummary {
  balance: number;
  balanceLabel: string;
  runwayBand: RunwayBand;
  runwayMonths: number;
  weeklyRevenue: number;
  weeklyExpenses: number;
  netWeekly: number;
  weeklyRevenueLabel: string;
  weeklyExpensesLabel: string;
  netWeeklyLabel: string;
  sponsorCount: number;
  koenkaiIncome: number;
  koenkaiIncomeLabel: string;
  hasLoan: boolean;
  loanAmount: number;
  loanAmountLabel: string;
  isInsolventRisk: boolean;
}

function toRunwayBand(months: number): RunwayBand {
  if (months >= 12) return "secure";
  if (months >= 6) return "comfortable";
  if (months >= 3) return "tight";
  if (months >= 1) return "critical";
  return "desperate";
}

export function projectFinanceSummary(world: WorldState): FinanceSummary | null {
  if (!world.playerHeyaId) return null;
  const heya = getPlayerHeya(world);
  if (!heya) return null;

  const fin = calculateHeyaWeeklyFinances(heya, world);
  const runwayBand = toRunwayBand(fin.runwayMonths);

  // The Loan model has no term/due-date field — "overdue" cannot be derived,
  // so no isOverdue flag is emitted (previously invented 12-month heuristic).
  const loans = heya.activeLoans ?? [];
  let loanAmount = 0;
  for (const l of loans) {
    loanAmount += l.remainingBalance;
  }

  const koenkai = world.sponsorPool?.koenkais?.get(heya.koenkaiId ?? "");
  const sponsorCount = koenkai?.members?.length ?? 0;

  const koenkaiIncome = Math.floor(
    (calculateKoenkaiIncome(heya.koenkaiBand ?? "none") * KOENKAI_INCOME_SPLIT.heyaPortion) / 4
  );

  return {
    balance: heya.funds,
    balanceLabel: formatYen(heya.funds),
    runwayBand,
    runwayMonths: Math.round(fin.runwayMonths),
    weeklyRevenue: fin.revenue,
    weeklyExpenses: fin.expenses,
    netWeekly: fin.revenue - fin.expenses,
    weeklyRevenueLabel: formatYen(fin.revenue),
    weeklyExpensesLabel: formatYen(fin.expenses),
    netWeeklyLabel: formatYen(fin.revenue - fin.expenses),
    sponsorCount,
    koenkaiIncome,
    koenkaiIncomeLabel: formatYen(koenkaiIncome),
    hasLoan: loanAmount > 0,
    loanAmount,
    loanAmountLabel: formatYen(loanAmount),
    isInsolventRisk: heya.funds < 0 || runwayBand === "desperate",
  };
}
