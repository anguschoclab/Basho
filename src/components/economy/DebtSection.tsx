/**
 * DebtSection.tsx
 *
 * Active institutional debt section for economy page.
 */

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { SortMenu } from "@/components/ui/SortMenu";
import { compareBy, type SortDirection } from "@/lib/sortUtils";
import { LoanCard } from "./DebtSections";
import { LOAN_SORT_OPTIONS, LOAN_ACCESSOR, type LoanRow } from "./debtMeta";

interface DebtSectionProps {
  activeLoans: LoanRow[];
  /** Called with the loan id when the player requests early repayment. */
  onPrepay?: (loanId: string) => void;
}

export function DebtSection({ activeLoans, onPrepay }: DebtSectionProps) {
  const [sortKey, setSortKey] = useState<string>("remainingBalance");
  const [sortOrder, setSortOrder] = useState<SortDirection>("desc");

  const sortedLoans = useMemo(() => {
    if (!activeLoans || activeLoans.length === 0) return [];
    const fn = LOAN_ACCESSOR[sortKey];
    if (!fn) return activeLoans;
    return [...activeLoans].sort((a, b) => compareBy(a, b, fn, sortOrder));
  }, [activeLoans, sortKey, sortOrder]);

  if (!activeLoans || activeLoans.length === 0) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-success/8 border border-success/20 text-success">
        <span className="text-lg">✓</span>
        <span className="text-sm font-bold">No active debt obligations.</span>
      </div>
    );
  }

  return (
    <Card className="border-destructive/20 bg-destructive/5 text-inherit paper overflow-hidden">
      <div className="bg-destructive/10 text-inherit px-4 py-2 border-b border-destructive/20 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <span className="text-xs font-bold text-destructive uppercase tracking-widest">
            Active Institutional Debt
          </span>
        </div>
        <SortMenu
          options={LOAN_SORT_OPTIONS}
          storageKey="basho_sort_debt"
          defaultSortKey="remainingBalance"
          defaultSortOrder="desc"
          onSortChange={(key, order) => {
            setSortKey(key);
            setSortOrder(order);
          }}
        />
      </div>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {sortedLoans.map((loan) => (
            <LoanCard key={loan.id} loan={loan} onPrepay={onPrepay} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
