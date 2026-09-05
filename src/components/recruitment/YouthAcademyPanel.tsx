/**
 * YouthAcademyPanel — player control for the youth academy.
 *
 * Lets the player build, upgrade, and view their youth academy.
 * The academy develops young prospects before they enter the banzuke.
 */
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GraduationCap, ArrowUpCircle } from "lucide-react";
import type { YouthAcademyProjection } from "@/presenters/youthAcademyProjections";

export function YouthAcademyPanel({
  projection,
  cash,
  onBuild,
  onUpgrade,
}: {
  projection: YouthAcademyProjection;
  cash: number;
  onBuild: () => void;
  onUpgrade: () => void;
}) {
  if (!projection.hasAcademy) {
    const buildCost = 50_000;
    const canAfford = cash >= buildCost;
    return (
      <Card className="border-primary/20" data-testid="youth-academy-panel">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Youth Academy</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Build a Youth Academy to develop young prospects before they enter
            the formal banzuke. A level-1 academy can hold up to 3 prospects.
          </p>
          <div className="flex items-center justify-between">
            <span className="text-sm tabular-nums">
              Cost: <span className={canAfford ? "text-foreground" : "text-destructive"}>{buildCost.toLocaleString()}</span>
            </span>
            <Button
              size="sm"
              disabled={!canAfford}
              onClick={onBuild}
              data-testid="build-youth-academy"
            >
              Build Academy
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { academy, canUpgrade, upgradeCost } = projection;
  const canAffordUpgrade = cash >= upgradeCost;
  const a = academy;

  if (!a) return null;

  return (
    <Card className="border-primary/20" data-testid="youth-academy-panel">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Youth Academy</span>
          <Badge variant="outline" className="ml-auto text-xs">
            Level {a.level}/{a.maxLevel}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 rounded bg-muted/20">
            <div className="text-muted-foreground">Prospects</div>
            <div className="text-sm font-medium tabular-nums">
              {a.prospectCount}/{a.maxProspects}
            </div>
          </div>
          <div className="p-2 rounded bg-muted/20">
            <div className="text-muted-foreground">Graduated</div>
            <div className="text-sm font-medium tabular-nums">
              {a.totalGraduated}
            </div>
          </div>
        </div>

        {a.prospects.length > 0 && (
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground uppercase tracking-widest">
              Current Prospects
            </span>
            {a.prospects.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-2 rounded border border-border/50 text-xs"
                data-testid={`prospect-${p.id}`}
              >
                <div>
                  <span className="font-medium">{p.shikona}</span>
                  <span className="text-muted-foreground ml-2">Age {p.age}</span>
                </div>
                <div className="flex items-center gap-2 tabular-nums">
                  <span className="text-muted-foreground">{p.region}</span>
                  <Badge variant="outline" className="text-[9px]">
                    Pot {p.potential}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}

        {canUpgrade && (
          <div className="flex items-center justify-between pt-2 border-t border-border/30">
            <div className="flex items-center gap-2">
              <ArrowUpCircle className="h-4 w-4 text-primary" />
              <span className="text-xs">
                Upgrade to Level {a.level + 1}
              </span>
              <span className="text-sm tabular-nums">
                {upgradeCost.toLocaleString()}
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={!canAffordUpgrade}
              onClick={onUpgrade}
              data-testid="upgrade-youth-academy"
            >
              Upgrade
            </Button>
          </div>
        )}

        {!canUpgrade && (
          <div className="text-xs text-muted-foreground text-center pt-2 border-t border-border/30">
            Academy at maximum level
          </div>
        )}
      </CardContent>
    </Card>
  );
}
