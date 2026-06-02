/**
 * financeProjections.ts
 *
 * Full finance summary projection for the Finance page and Control Center.
 * Extracts the inline useMemo calculations from EconomyPage into a reusable presenter.
 */

import type { WorldState } from "../../engine/types/world";
import { calculateHeyaWeeklyFinances } from "../../engine/systems/economy/FinanceCalculator";
import { calculateKoenkaiIncome } from "../../engine/systems/economics/SponsorshipService";
import { KOENKAI_INCOME_SPLIT } from "../../constants/engine/economic";
import { formatYen } from "../../utils/engineUtils";

export type RunwayBand = "secure" | "comfortable" | "tight" | "critical" | "desperate";

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
  isOverdue: boolean;
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
  const heya = world.heyas.get(world.playerHeyaId);
  if (!heya) return null;

  const fin = calculateHeyaWeeklyFinances(heya, world);
  const runwayBand = toRunwayBand(fin.runwayMonths);

  const loans = heya.activeLoans ?? [];
  const loanAmount = loans.reduce((s, l) => s + l.remainingBalance, 0);
  const currentMonth = Math.ceil((world.week ?? 1) / 4);
  const isOverdue = loans.some(
    (l) => l.remainingBalance > 0 && currentMonth > l.issuedAtMonth + 12
  );

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
    isOverdue,
    loanAmount,
    loanAmountLabel: formatYen(loanAmount),
    isInsolventRisk: heya.funds < 0 || runwayBand === "desperate",
  };
}
