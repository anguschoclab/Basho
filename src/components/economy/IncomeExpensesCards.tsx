/**
 * IncomeExpensesCards.tsx
 *
 * Income Sources and Expenses cards for economy page.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { formatYen } from "@/utils/engineUtils";

interface WeeklyFinances {
  revenue: number;
  expenses: number;
}

interface IncomeExpensesCardsProps {
  weeklyFinances: WeeklyFinances | null;
}

export function IncomeExpensesCards({ weeklyFinances }: IncomeExpensesCardsProps) {
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
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-success mt-2" aria-hidden="true" />
                    <div>
                      <p className="font-medium">Kōenkai Support</p>
                      <p className="text-sm text-muted-foreground">
                        {formatYen(Math.round(weeklyFinances.revenue * 0.4))} / week (estimated)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-success mt-2" aria-hidden="true" />
                    <div>
                      <p className="font-medium">JSA Subsidies</p>
                      <p className="text-sm text-muted-foreground">
                        {formatYen(Math.round(weeklyFinances.revenue * 0.35))} / week (estimated)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-success mt-2" aria-hidden="true" />
                    <div>
                      <p className="font-medium">Sponsor Tier Income</p>
                      <p className="text-sm text-muted-foreground">
                        {formatYen(Math.round(weeklyFinances.revenue * 0.25))} / week (estimated)
                      </p>
                    </div>
                  </div>
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
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-destructive mt-2" aria-hidden="true" />
                    <div>
                      <p className="font-medium">Facility Maintenance</p>
                      <p className="text-sm text-muted-foreground">
                        {formatYen(Math.round(weeklyFinances.expenses * 0.3))} / week (estimated)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-destructive mt-2" aria-hidden="true" />
                    <div>
                      <p className="font-medium">Staff Salaries</p>
                      <p className="text-sm text-muted-foreground">
                        {formatYen(Math.round(weeklyFinances.expenses * 0.25))} / week (estimated)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-destructive mt-2" aria-hidden="true" />
                    <div>
                      <p className="font-medium">Food Costs</p>
                      <p className="text-sm text-muted-foreground">
                        {formatYen(Math.round(weeklyFinances.expenses * 0.25))} / week (estimated)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-destructive mt-2" aria-hidden="true" />
                    <div>
                      <p className="font-medium">Other Operations</p>
                      <p className="text-sm text-muted-foreground">
                        {formatYen(Math.round(weeklyFinances.expenses * 0.2))} / week (estimated)
                      </p>
                    </div>
                  </div>
                </div>
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
