/**
 * AcademyManagementPanel — foreign academy management for the World Circuit.
 *
 * Shows built foreign academies and lets the player construct new ones
 * in regions with sufficient presence (>= 80%).
 * Also lets the player invest budget into built academies to raise
 * candidate quality (wires the MANAGE_ACADEMY worker command).
 */
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Plus, TrendingUp } from "lucide-react";
import type { ForeignAcademy } from "@/engine/types/heya";

export interface AcademyManagementProjection {
  academies: Array<{
    region: string;
    builtAtYear: number;
    candidateQualityBonus: number;
  }>;
  buildableRegions: Array<{
    region: string;
    presence: number;
    canBuild: boolean;
  }>;
  hasAcademies: boolean;
}

const INVEST_PRESETS = [50_000, 100_000, 250_000] as const;

export function AcademyManagementPanel({
  projection,
  onBuild,
  onManage,
}: {
  projection: AcademyManagementProjection;
  onBuild: (region: string) => void;
  onManage?: (region: string, budget: number) => void;
}) {
  const [investBudgets, setInvestBudgets] = useState<Record<string, number>>({});

  return (
    <Card className="border-primary/20" data-testid="academy-management-panel">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Foreign Academies</span>
        </div>

        {projection.academies.length > 0 && (
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground uppercase tracking-widest">
              Built Academies
            </span>
            {projection.academies.map((a) => (
              <div
                key={a.region}
                className="p-2 rounded border border-border/50 text-xs space-y-2"
                data-testid={`academy-${a.region}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">{a.region}</span>
                    <span className="text-muted-foreground ml-2">
                      Built {a.builtAtYear}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[9px]">
                    +{a.candidateQualityBonus} Quality
                  </Badge>
                </div>
                {onManage && (
                  <div className="flex items-center gap-1 pt-1 border-t border-border/30">
                    <TrendingUp className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">Invest</span>
                    {INVEST_PRESETS.map((amount) => (
                      <Button
                        key={amount}
                        size="sm"
                        variant={investBudgets[a.region] === amount ? "default" : "outline"}
                        className="h-5 px-1.5 text-[9px] tabular-nums"
                        onClick={() =>
                          setInvestBudgets((prev) => ({ ...prev, [a.region]: amount }))
                        }
                        data-testid={`invest-preset-${a.region}-${amount}`}
                      >
                        ¥{amount >= 1000 ? `${amount / 1000}k` : amount}
                      </Button>
                    ))}
                    <Button
                      size="sm"
                      variant="default"
                      className="h-5 px-2 text-[9px] ml-auto"
                      disabled={!investBudgets[a.region]}
                      onClick={() => {
                        const budget = investBudgets[a.region];
                        if (budget) onManage(a.region, budget);
                        setInvestBudgets((prev) => ({ ...prev, [a.region]: 0 }));
                      }}
                      data-testid={`invest-academy-${a.region}`}
                    >
                      Confirm
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {projection.buildableRegions.length > 0 && (
          <div className="space-y-1 pt-2 border-t border-border/30">
            <span className="text-xs text-muted-foreground uppercase tracking-widest">
              Available Regions
            </span>
            {projection.buildableRegions.map((r) => (
              <div
                key={r.region}
                className="flex items-center justify-between p-2 rounded border border-border/50 text-xs"
                data-testid={`buildable-${r.region}`}
              >
                <div>
                  <span className="font-medium">{r.region}</span>
                  <span className="text-muted-foreground ml-2 tabular-nums">
                    {r.presence}% presence
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!r.canBuild}
                  onClick={() => onBuild(r.region)}
                  data-testid={`build-academy-${r.region}`}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Build
                </Button>
              </div>
            ))}
          </div>
        )}

        {projection.academies.length === 0 &&
          projection.buildableRegions.length === 0 && (
            <p className="text-xs text-muted-foreground text-center pt-2">
              No foreign academies. Increase regional presence via exhibition tours.
            </p>
          )}
      </CardContent>
    </Card>
  );
}

export type { ForeignAcademy };
