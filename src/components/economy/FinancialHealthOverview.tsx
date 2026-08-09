/**
 * FinancialHealthOverview.tsx
 *
 * Financial health overview card for economy page.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatYen } from "@/utils/engineUtils";
import type { RunwayBand } from "@/engine/types/narrative";
import { RUNWAY_CONFIG } from "../../constants/ui/economy";

interface FinancialHealthOverviewProps {
  funds: number;
  runwayBand: RunwayBand;
  hasFinancialRisk: boolean;
}

export function FinancialHealthOverview({
  funds,
  runwayBand,
  hasFinancialRisk,
}: FinancialHealthOverviewProps) {
  const runwayConfig = RUNWAY_CONFIG[runwayBand] || RUNWAY_CONFIG.tight;
  const RunwayIcon = runwayConfig.icon;

  return (
    <Card className="paper md:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <RunwayIcon className={`h-5 w-5 ${runwayConfig.color}`} />
            <span className={runwayConfig.color}>{runwayConfig.label}</span>
          </CardTitle>
          <CardDescription>{runwayConfig.description}</CardDescription>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest leading-none mb-1">
            Current Balance
          </div>
          <div
            className={cn(
              "text-2xl font-display font-bold tabular-nums",
              funds < 0 ? "text-destructive" : "text-foreground"
            )}
          >
            {formatYen(funds)}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Financial Runway</span>
              <span className={runwayConfig.color}>{runwayConfig.label}</span>
            </div>
            <Progress value={runwayConfig.progressValue} className="h-3" />
          </div>

          {hasFinancialRisk && (
            <div
              className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg"
              aria-hidden="true"
            >
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="text-sm text-destructive">
                Financial pressure is rising. Consider cost control, sponsor growth, or safer
                training loads to reduce injury costs.
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
