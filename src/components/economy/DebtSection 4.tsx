/**
 * DebtSection.tsx
 *
 * Active institutional debt section for economy page.
 */

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";

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
  if (!activeLoans || activeLoans.length === 0) return null;

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
                  <div className="text-lg font-bold">¥{loan.remainingBalance.toLocaleString()}</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center py-2 border-y border-border/30">
                <div>
                  <div className="text-[9px] text-muted-foreground uppercase font-bold">
                    Principal
                  </div>
                  <div className="text-sm font-medium">¥{loan.principal.toLocaleString()}</div>
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
                    ¥{loan.monthlyPayment.toLocaleString()}
                  </div>
                </div>
              </div>

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
