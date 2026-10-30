/**
 * IncomeExpensesCards.tsx
 *
 * Income Sources and Expenses cards for economy page.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { formatYen } from "@/lib/engineUtils";

interface WeeklyFinances {
  revenue: number;
  expenses: number;
  totalBurn?: number;
  income: {
    koenkai: number;
    jsaSubsidy: number;
    sponsorTier: number;
    jsaGrant: number;
    oyakataSalary: number;
  };
  outgoings: {
    facilityUpkeep: number;
    staffUpkeep: number;
    fixedOverhead: number;
    recruitment: number;
    infrastructureUpkeep?: number;
  };
}

interface IncomeExpensesCardsProps {
  weeklyFinances: WeeklyFinances | null;
}

function BreakdownRow({
  label,
  amount,
  tone,
}: {
  label: string;
  amount: number;
  tone: "success" | "destructive";
}) {
  if (amount === 0) return null;
  return (
    <div className="flex items-start gap-3">
      <div
        aria-hidden="true"
        className={`w-2 h-2 rounded-full mt-2 ${tone === "success" ? "bg-success" : "bg-destructive"}`}
      />
      <div className="flex w-full items-baseline justify-between gap-2">
        <p className="font-medium">{label}</p>
        <p className="text-sm text-muted-foreground tabular-nums">
          {formatYen(Math.round(amount))} / week
        </p>
      </div>
    </div>
  );
}

export function IncomeExpensesCards({ weeklyFinances }: IncomeExpensesCardsProps) {
  const incomeRows: Array<[string, number]> = weeklyFinances
    ? [
        ["Kōenkai Support", weeklyFinances.income.koenkai],
        ["JSA Subsidies", weeklyFinances.income.jsaSubsidy],
        ["Sponsor Tier Income", weeklyFinances.income.sponsorTier],
        ["JSA Weekly Grant", weeklyFinances.income.jsaGrant],
        ["Oyakata Salary", weeklyFinances.income.oyakataSalary],
      ]
    : [];
  const expenseRows: Array<[string, number]> = weeklyFinances
    ? [
        ["Facility Upkeep", weeklyFinances.outgoings.facilityUpkeep],
        ["Staff Upkeep", weeklyFinances.outgoings.staffUpkeep],
        ["Fixed Operating Overhead", weeklyFinances.outgoings.fixedOverhead],
        ["Recruitment Budget", weeklyFinances.outgoings.recruitment],
        ["Building Maintenance", weeklyFinances.outgoings.infrastructureUpkeep ?? 0],
      ]
    : [];
  const recruitmentSuspended =
    weeklyFinances &&
    weeklyFinances.totalBurn !== undefined &&
    weeklyFinances.expenses < weeklyFinances.totalBurn;

  return (
    <>
      {/* Income Sources */}
      <Card className="paper">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-success" />
            Income Sources
          </CardTitle>
          <CardDescription>Where your heya's support typically comes from</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {weeklyFinances ? (
              <>
                <div className="flex items-center justify-between py-2 border-b border-border/30">
                  <span className="text-muted-foreground">Weekly Revenue</span>
                  <span className="font-display font-bold text-success">
                    {formatYen(weeklyFinances.revenue)}
                  </span>
                </div>
                <div className="space-y-2 pt-2">
                  {incomeRows.map(([label, amount]) => (
                    <BreakdownRow key={label} label={label} amount={amount} tone="success" />
                  ))}
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground italic">Financial data unavailable</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Expenses */}
      <Card className="paper">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-destructive" />
            Ongoing Expenses
          </CardTitle>
          <CardDescription>The recurring costs of running a heya</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {weeklyFinances ? (
              <>
                <div className="flex items-center justify-between py-2 border-b border-border/30">
                  <span className="text-muted-foreground">Weekly Expenses</span>
                  <span className="font-display font-bold text-destructive">
                    {formatYen(weeklyFinances.expenses)}
                  </span>
                </div>
                <div className="space-y-2 pt-2">
                  {expenseRows.map(([label, amount]) => (
                    <BreakdownRow key={label} label={label} amount={amount} tone="destructive" />
                  ))}
                </div>
                {recruitmentSuspended && (
                  <p className="text-[10px] text-muted-foreground pt-1">
                    Recruitment suspended — income below operating costs
                  </p>
                )}
              </>
            ) : (
              <div className="text-sm text-muted-foreground italic">Financial data unavailable</div>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
