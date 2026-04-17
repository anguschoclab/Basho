/**
 * IncomeExpensesCards.tsx
 *
 * Income Sources and Expenses cards for economy page.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";

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
            <TrendingUp className="h-5 w-5 text-green-400" />
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
                  <span className="font-display font-bold text-green-400">
                    ¥{weeklyFinances.revenue.toLocaleString()}
                  </span>
                </div>
                <div className="space-y-2 pt-2">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-400 mt-2" />
                    <div>
                      <p className="font-medium">Kōenkai Support</p>
                      <p className="text-sm text-muted-foreground">
                        ¥{(weeklyFinances.revenue * 0.4).toFixed(0).toLocaleString()} / week
                        (estimated)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-400 mt-2" />
                    <div>
                      <p className="font-medium">JSA Subsidies</p>
                      <p className="text-sm text-muted-foreground">
                        ¥{(weeklyFinances.revenue * 0.35).toFixed(0).toLocaleString()} / week
                        (estimated)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-400 mt-2" />
                    <div>
                      <p className="font-medium">Sponsor Tier Income</p>
                      <p className="text-sm text-muted-foreground">
                        ¥{(weeklyFinances.revenue * 0.25).toFixed(0).toLocaleString()} / week
                        (estimated)
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
            <TrendingDown className="h-5 w-5 text-red-400" />
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
                  <span className="font-display font-bold text-red-400">
                    ¥{weeklyFinances.expenses.toLocaleString()}
                  </span>
                </div>
                <div className="space-y-2 pt-2">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-red-400 mt-2" />
                    <div>
                      <p className="font-medium">Facility Maintenance</p>
                      <p className="text-sm text-muted-foreground">
                        ¥{(weeklyFinances.expenses * 0.3).toFixed(0).toLocaleString()} / week
                        (estimated)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-red-400 mt-2" />
                    <div>
                      <p className="font-medium">Staff Salaries</p>
                      <p className="text-sm text-muted-foreground">
                        ¥{(weeklyFinances.expenses * 0.25).toFixed(0).toLocaleString()} / week
                        (estimated)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-red-400 mt-2" />
                    <div>
                      <p className="font-medium">Food Costs</p>
                      <p className="text-sm text-muted-foreground">
                        ¥{(weeklyFinances.expenses * 0.25).toFixed(0).toLocaleString()} / week
                        (estimated)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-red-400 mt-2" />
                    <div>
                      <p className="font-medium">Other Operations</p>
                      <p className="text-sm text-muted-foreground">
                        ¥{(weeklyFinances.expenses * 0.2).toFixed(0).toLocaleString()} / week
                        (estimated)
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
