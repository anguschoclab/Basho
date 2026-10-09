/**
 * debtMeta.ts
 *
 * Debt section meta — the loan shape consumed by the economy page and the
 * sort option/accessor tables.
 */

import type { SortOption } from "@/components/ui/SortMenu";

export interface LoanRow {
  id: string;
  type: string;
  providerName: string;
  amount: number;
  interestRate: number;
  dueWeek: number;
  remainingBalance: number;
  principal: number;
  monthlyPayment: number;
  stringsAttached?: string[];
}

export const LOAN_SORT_OPTIONS: SortOption[] = [
  { key: "remainingBalance", label: "Remaining" },
  { key: "principal", label: "Principal" },
  { key: "interestRate", label: "Interest" },
  { key: "monthlyPayment", label: "Monthly" },
  { key: "dueWeek", label: "Due Week" },
  { key: "providerName", label: "Provider" },
];

export const LOAN_ACCESSOR: Record<string, (l: LoanRow) => string | number | undefined> = {
  remainingBalance: (l) => l.remainingBalance,
  principal: (l) => l.principal,
  interestRate: (l) => l.interestRate,
  monthlyPayment: (l) => l.monthlyPayment,
  dueWeek: (l) => l.dueWeek,
  providerName: (l) => l.providerName,
};
