/**
 * DebtSections.tsx
 *
 * Debt section pieces — the per-loan card (provider, terms, payoff
 * progress, prepay action, stipulations) and the sort option/accessor
 * tables.
 */

import { Badge } from "@/components/ui/badge";
import { Banknote } from "lucide-react";
import { formatYen } from "@/utils/engineUtils";
import { Button } from "@/components/ui/button";
import type { Loan } from "./debtMeta";

/** Payoff progress bar + estimated weeks remaining. */
function PayoffProgress({ loan }: { loan: Loan }) {
  if (loan.principal <= 0) return null;
  const pct = Math.min(100, (1 - loan.remainingBalance / loan.principal) * 100);

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase">
        <span>Payoff Progress</span>
        <span>{Math.round(pct)}% paid</span>
      </div>
      <div className="w-full h-2 bg-muted/40 rounded-full overflow-hidden">
        <div
          role="progressbar"
          aria-label={`Payoff progress for ${loan.providerName} loan`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pct)}
          className="h-full bg-success rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
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
  );
}

/** Institutional stipulations badges. */
function Stipulations({ strings }: { strings: string[] }) {
  return (
    <div className="space-y-1.5">
      <div className="text-[9px] text-muted-foreground uppercase font-bold">
        Institutional Stipulations:
      </div>
      <div className="flex flex-wrap gap-1.5">
        {strings.map((s: string) => (
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
  );
}

/** Single loan card — terms, payoff progress, prepay, stipulations. */
export function LoanCard({
  loan,
  onPrepay,
}: {
  loan: Loan;
  onPrepay?: (loanId: string) => void;
}) {
  return (
    <div className="p-4 rounded-lg bg-background/50 border border-destructive/10 space-y-3">
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
          <div className="text-[9px] text-muted-foreground uppercase font-bold">Principal</div>
          <div className="text-sm font-medium">{formatYen(loan.principal)}</div>
        </div>
        <div>
          <div className="text-[9px] text-muted-foreground uppercase font-bold">Interest</div>
          <div className="text-sm font-medium">{(loan.interestRate * 100).toFixed(1)}%</div>
        </div>
        <div>
          <div className="text-[9px] text-muted-foreground uppercase font-bold">Monthly</div>
          <div className="text-sm font-bold text-destructive">
            {formatYen(loan.monthlyPayment)}
          </div>
        </div>
      </div>

      <PayoffProgress loan={loan} />

      {onPrepay && loan.remainingBalance > 0 && (
        <Button
          variant="outline"
          size="sm"
          className="w-full text-[11px] font-bold uppercase tracking-wider border-success/30 text-success hover:bg-success/10"
          onClick={() => onPrepay(loan.id)}
        >
          <Banknote className="h-3.5 w-3.5 mr-1.5" />
          Prepay remaining balance ({formatYen(loan.remainingBalance)})
        </Button>
      )}

      {loan.stringsAttached && loan.stringsAttached.length > 0 && (
        <Stipulations strings={loan.stringsAttached} />
      )}
    </div>
  );
}
