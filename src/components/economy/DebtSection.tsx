/**
 * DebtSection.tsx
 *
 * Active institutional debt section for economy page.
 */

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { formatYen } from "@/utils/engineUtils";

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

export function DebtSection({ activeLoans }: DebtSectionProps) {
  if (!activeLoans || activeLoans.length === 0) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-success/8 border border-success/20 text-success">
        <span className="text-lg">✓</span>
        <span className="text-sm font-bold">No active debt obligations.</span>
      </div>
    );
  }

  return (
    <Card className="border-destructive/20 bg-destructive/5 paper overflow-hidden">
      <div className="bg-destructive/10 px-4 py-2 border-b border-destructive/20 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-destructive" />
        <span className="text-xs font-bold text-destructive uppercase tracking-widest">
          Active Institutional Debt
        </span>
      </div>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {activeLoans.map((loan) => (
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
                    <span>{Math.round((1 - loan.remainingBalance / loan.principal) * 100)}% paid</span>
                  </div>
                  <div className="w-full h-2 bg-muted/40 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-success rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (1 - loan.remainingBalance / loan.principal) * 100)}%` }}
                    />
                  </div>
                  {loan.monthlyPayment > 0 && (
                    <div className="text-[10px] text-muted-foreground">
                      Est. payoff in{" "}
                      <span className="font-bold text-foreground">
                        {Math.ceil(loan.remainingBalance / (loan.monthlyPayment / 4.33))} weeks
                      </span>
                      {" "}at current monthly rate
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
