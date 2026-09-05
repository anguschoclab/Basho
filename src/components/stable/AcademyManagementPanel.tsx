/**
 * AcademyManagementPanel — foreign academy management for the World Circuit.
 *
 * Shows built foreign academies and lets the player construct new ones
 * in regions with sufficient presence (>= 80%).
 */
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Plus } from "lucide-react";
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

export function AcademyManagementPanel({
  projection,
  onBuild,
}: {
  projection: AcademyManagementProjection;
  onBuild: (region: string) => void;
}) {
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
                className="flex items-center justify-between p-2 rounded border border-border/50 text-xs"
                data-testid={`academy-${a.region}`}
              >
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
