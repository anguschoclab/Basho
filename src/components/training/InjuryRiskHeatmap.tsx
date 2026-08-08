// InjuryRiskHeatmap.tsx — Roster-wide injury risk matrix visualization
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TooltipWrap } from "@/components/ui/tooltip-wrap";
import { toFatigueBand } from "@/engine/descriptorBands";
import { FATIGUE_LABELS } from "@/constants/ui/labels";

interface InjuryRiskHeatmapProps {
  rikishiList: Array<{
    id: string;
    shikona: string;
    rankLabel: string;
    isInjured: boolean;
    condition: number;
    fatigue: number;
    injurySummary?: string;
  }>;
}

type RiskBand = "safe" | "caution" | "high";

function getRiskBand(value: number): RiskBand {
  if (value <= 30) return "safe";
  if (value <= 60) return "caution";
  return "high";
}

// Condition is 0-100 where 100 = peak health
function conditionLabel(condition: number): string {
  if (condition >= 85) return "Peak";
  if (condition >= 65) return "Good";
  if (condition >= 40) return "Worn";
  return "Critical";
}

// Risk score is 0-100 where 0 = no risk
function riskLabel(score: number): string {
  if (score <= 5) return "None";
  if (score <= 20) return "Low";
  if (score <= 45) return "Moderate";
  if (score <= 70) return "High";
  return "Critical";
}

function getCellClasses(value: number, isInjured: boolean): string {
  if (isInjured) {
    return "bg-destructive/20 text-destructive";
  }
  const band = getRiskBand(value);
  if (band === "safe") return "bg-success/20 text-success";
  if (band === "caution") return "bg-warning/20 text-warning";
  return "bg-destructive/20 text-destructive";
}

function calcRiskScore(condition: number, fatigue: number): number {
  return Math.round((100 - condition) * 0.6 + fatigue * 0.4);
}

export function InjuryRiskHeatmap({ rikishiList }: InjuryRiskHeatmapProps) {
  if (rikishiList.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Roster Risk Matrix</CardTitle>
          <CardDescription>Condition & fatigue risk scores per rikishi</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No active rikishi to display.</p>
        </CardContent>
      </Card>
    );
  }

  const sorted = [...rikishiList].sort((a, b) => {
    if (a.isInjured !== b.isInjured) return a.isInjured ? -1 : 1;
    const riskA = calcRiskScore(a.condition, a.fatigue);
    const riskB = calcRiskScore(b.condition, b.fatigue);
    return riskB - riskA;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Roster Risk Matrix</CardTitle>
        <CardDescription>Condition & fatigue risk scores per rikishi</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2 pr-4 text-left font-medium text-muted-foreground">Rikishi</th>
                <th className="py-2 px-2 text-center font-medium text-muted-foreground w-28">
                  Condition
                </th>
                <th className="py-2 px-2 text-center font-medium text-muted-foreground w-28">
                  Fatigue
                </th>
                <th className="py-2 pl-2 text-center font-medium text-muted-foreground w-28">
                  Risk Score
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => {
                const riskScore = calcRiskScore(r.condition, r.fatigue);
                // Fatigue: invert so 0 = best, 100 = worst (consistent with color logic)
                const conditionRisk = 100 - r.condition;
                return (
                  <tr
                    key={r.id}
                    className={
                      r.isInjured
                        ? "bg-destructive/5 border-b border-border last:border-0"
                        : "border-b border-border last:border-0"
                    }
                  >
                    <td className="py-2 pr-4">
                      <TooltipWrap
                        content={
                          r.isInjured && r.injurySummary ? <span>{r.injurySummary}</span> : null
                        }
                      >
                        <span className="cursor-default">
                          <span className="font-medium">{r.shikona}</span>
                          <span className="ml-2 text-xs text-muted-foreground">{r.rankLabel}</span>
                          {r.isInjured && (
                            <span className="ml-2 text-xs font-semibold text-destructive">INJ</span>
                          )}
                        </span>
                      </TooltipWrap>
                    </td>
                    <td className="py-1.5 px-2">
                      <div
                        className={`rounded px-2 py-1 text-center font-mono text-xs font-medium ${getCellClasses(conditionRisk, r.isInjured)}`}
                      >
                        {conditionLabel(r.condition)}
                      </div>
                    </td>
                    <td className="py-1.5 px-2">
                      <div
                        className={`rounded px-2 py-1 text-center font-mono text-xs font-medium tabular-nums ${getCellClasses(r.fatigue, r.isInjured)}`}
                      >
                        {FATIGUE_LABELS[toFatigueBand(r.fatigue)]}
                      </div>
                    </td>
                    <td className="py-1.5 pl-2">
                      <div
                        className={`rounded px-2 py-1 text-center font-mono text-xs font-medium ${getCellClasses(riskScore, r.isInjured)}`}
                      >
                        {r.isInjured ? "Injured" : riskLabel(riskScore)}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground border-t border-border pt-3">
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm bg-success/30" / aria-hidden="true">
            <span>Safe</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm bg-warning/30" / aria-hidden="true">
            <span>Caution</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm bg-destructive/30" / aria-hidden="true">
            <span>High Risk / Injured</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
