/**
 * AcademyInvestmentControl — budget display and investment controls.
 */
import { Button } from "@/components/ui/button";
import { Coins } from "lucide-react";

interface AcademyInvestmentControlProps {
  budget: number;
  onInvest?: (amount: number) => void;
}

const INVEST_AMOUNTS = [50_000, 100_000, 250_000];

export function AcademyInvestmentControl({ budget, onInvest }: AcademyInvestmentControlProps) {
  return (
    <div className="space-y-2" data-testid="academy-investment-control">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground flex items-center gap-1">
          <Coins className="h-3.5 w-3.5" />
          Weekly Budget
        </span>
        <span className="font-mono">¥{budget.toLocaleString()}</span>
      </div>
      {onInvest && (
        <div className="flex gap-2">
          {INVEST_AMOUNTS.map((amount) => (
            <Button
              key={amount}
              size="sm"
              variant="outline"
              onClick={() => onInvest(amount)}
              data-testid={`invest-${amount}`}
            >
              +¥{amount >= 1000 ? `${amount / 1000}k` : amount}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
