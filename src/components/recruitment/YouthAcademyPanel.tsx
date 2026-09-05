/**
 * YouthAcademyPanel — player control for the youth academy.
 *
 * Lets the player build, upgrade, invest, hire staff, promote prospects,
 * and view their youth academy development pipeline.
 */
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GraduationCap, ArrowUpCircle, Coins, UserPlus, CheckCircle } from "lucide-react";
import type { YouthAcademyProjection } from "@/presenters/youthAcademyProjections";
import type { AcademyStaffRole } from "@/engine/types/academy";

const STAFF_ROLES: AcademyStaffRole[] = ["head_coach", "conditioning", "nutrition", "technique"];
const STAFF_LABELS: Record<AcademyStaffRole, string> = {
  head_coach: "Head Coach",
  conditioning: "Conditioning",
  nutrition: "Nutrition",
  technique: "Technique",
};

export function YouthAcademyPanel({
  projection,
  cash,
  onBuild,
  onUpgrade,
  onInvest,
  onHireStaff,
  onPromote,
}: {
  projection: YouthAcademyProjection;
  cash: number;
  onBuild: () => void;
  onUpgrade: () => void;
  onInvest: (amount: number) => void;
  onHireStaff: (role: AcademyStaffRole) => void;
  onPromote: (prospectId: string) => void;
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

  const hireCost = 100_000;
  const canAffordStaff = cash >= hireCost;
  const filledRoles = new Set(a.staff.map((s) => s.role));
  const canHireMore = a.staff.length < a.maxStaff;

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

        <div className="grid grid-cols-3 gap-2 text-xs">
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
          <div className="p-2 rounded bg-muted/20">
            <div className="text-muted-foreground">Budget</div>
            <div className="text-sm font-medium tabular-nums">
              {a.budget.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Staff section */}
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground uppercase tracking-widest">
            Staff ({a.staff.length}/{a.maxStaff})
          </span>
          {a.staff.length > 0 && (
            <div className="space-y-1">
              {a.staff.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-2 rounded border border-border/50 text-xs"
                  data-testid={`staff-${s.id}`}
                >
                  <div>
                    <span className="font-medium">{s.name}</span>
                    <span className="text-muted-foreground ml-2">{STAFF_LABELS[s.role]}</span>
                  </div>
                  <Badge variant="outline" className="text-[9px]">
                    Q {s.quality}
                  </Badge>
                </div>
              ))}
            </div>
          )}
          {canHireMore && (
            <div className="flex flex-wrap gap-1 pt-1">
              {STAFF_ROLES.filter((r) => !filledRoles.has(r)).map((role) => (
                <Button
                  key={role}
                  size="sm"
                  variant="outline"
                  disabled={!canAffordStaff}
                  onClick={() => onHireStaff(role)}
                  className="text-[10px] h-6"
                  data-testid={`hire-staff-${role}`}
                >
                  <UserPlus className="h-3 w-3 mr-1" />
                  {STAFF_LABELS[role]}
                </Button>
              ))}
            </div>
          )}
          {!canHireMore && a.staff.length > 0 && (
            <p className="text-[10px] text-muted-foreground">Staff capacity reached for this level.</p>
          )}
        </div>

        {/* Prospects section */}
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
                <div className="flex-1">
                  <span className="font-medium">{p.shikona}</span>
                  <span className="text-muted-foreground ml-2">Age {p.age}</span>
                  <span className="text-muted-foreground ml-2">{p.region}</span>
                </div>
                <div className="flex items-center gap-2 tabular-nums">
                  <Badge variant="outline" className="text-[9px]">
                    Pot {p.potential}
                  </Badge>
                  <Badge variant="outline" className="text-[9px]">
                    Ability {p.currentAbility}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-[10px] px-2"
                    onClick={() => onPromote(p.id)}
                    data-testid={`promote-${p.id}`}
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Promote
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Invest section */}
        <div className="flex items-center justify-between pt-2 border-t border-border/30">
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-primary" />
            <span className="text-xs">Invest in development</span>
          </div>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              disabled={cash < 50_000}
              onClick={() => onInvest(50_000)}
              className="text-[10px] h-7"
              data-testid="invest-50k"
            >
              50K
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={cash < 100_000}
              onClick={() => onInvest(100_000)}
              className="text-[10px] h-7"
              data-testid="invest-100k"
            >
              100K
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={cash < 500_000}
              onClick={() => onInvest(500_000)}
              className="text-[10px] h-7"
              data-testid="invest-500k"
            >
              500K
            </Button>
          </div>
        </div>

        {/* Upgrade section */}
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
