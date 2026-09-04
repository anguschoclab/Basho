/**
 * DebtSection.tsx
 *
 * Active institutional debt section for economy page.
 */

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { formatYen } from "@/utils/engineUtils";
import { SortMenu, type SortOption } from "@/components/ui/SortMenu";
import { compareBy, type SortDirection } from "@/lib/sortUtils";

interface Loan {
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

interface DebtSectionProps {
  activeLoans: Loan[];
}

const LOAN_SORT_OPTIONS: SortOption[] = [
  { key: "remainingBalance", label: "Remaining" },
  { key: "principal", label: "Principal" },
  { key: "interestRate", label: "Interest" },
  { key: "monthlyPayment", label: "Monthly" },
  { key: "dueWeek", label: "Due Week" },
  { key: "providerName", label: "Provider" },
];

export function DebtSection({ activeLoans }: DebtSectionProps) {
  const [sortKey, setSortKey] = useState<string>("remainingBalance");
  const [sortOrder, setSortOrder] = useState<SortDirection>("desc");

  const sortedLoans = useMemo(() => {
    if (!activeLoans || activeLoans.length === 0) return [];
    const accessor: Record<string, (l: Loan) => string | number | undefined> = {
      remainingBalance: (l) => l.remainingBalance,
      principal: (l) => l.principal,
      interestRate: (l) => l.interestRate,
      monthlyPayment: (l) => l.monthlyPayment,
      dueWeek: (l) => l.dueWeek,
      providerName: (l) => l.providerName,
    };
    const fn = accessor[sortKey];
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
            <div
              key={loan.id}
              className="p-4 rounded-lg bg-background/50 border border-destructive/10 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="destructive" className="uppercase text-[10px]">
                    {loan.type} Loan
                  </Badge>
                  <span className="font-bold">{loan.providerName}</span>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">
                    Remaining
                  </div>
                  <div className="text-lg font-bold">{formatYen(loan.remainingBalance)}</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center py-2 border-y border-border/30">
                <div>
                  <div className="text-[9px] text-muted-foreground uppercase font-bold">
                    Principal
                  </div>
                  <div className="text-sm font-medium">{formatYen(loan.principal)}</div>
                </div>
                <div>
                  <div className="text-[9px] text-muted-foreground uppercase font-bold">
                    Interest
                  </div>
                  <div className="text-sm font-medium">{(loan.interestRate * 100).toFixed(1)}%</div>
                </div>
                <div>
                  <div className="text-[9px] text-muted-foreground uppercase font-bold">
                    Monthly
                  </div>
                  <div className="text-sm font-bold text-destructive">
                    {formatYen(loan.monthlyPayment)}
                  </div>
                </div>
              </div>

              {/* Payoff progress bar */}
              {loan.principal > 0 && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase">
                    <span>Payoff Progress</span>
                    <span>
                      {Math.round((1 - loan.remainingBalance / loan.principal) * 100)}% paid
                    </span>
                  </div>
                  <div className="w-full h-2 bg-muted/40 rounded-full overflow-hidden">
                    <div
                      aria-hidden="true"
                      className="h-full bg-success rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, (1 - loan.remainingBalance / loan.principal) * 100)}%`,
                      }}
                    />
                  </div>
                  {loan.monthlyPayment > 0 && (
                    <div className="text-[10px] text-muted-foreground">
                      Est. payoff in{" "}
                      <span className="font-bold text-foreground">
                        {Math.ceil(loan.remainingBalance / (loan.monthlyPayment / 4.33))} weeks
                      </span>{" "}
                      at current monthly rate
                    </div>
                  )}
                </div>
              )}

              {loan.stringsAttached && loan.stringsAttached.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[9px] text-muted-foreground uppercase font-bold">
                    Institutional Stipulations:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {loan.stringsAttached.map((s: string) => (
                      <Badge
                        key={s}
                        variant="outline"
                        className="text-[9px] border-destructive/30 text-destructive bg-destructive/5 py-0"
                      >
                        {s.replace(/_/g, " ").toUpperCase()}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
