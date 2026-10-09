/**
 * YouthAcademyPanelSections.tsx
 *
 * Sections of YouthAcademyPanel — build empty state, staff roster,
 * prospects list, investment buttons, and upgrade footer.
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

type Academy = NonNullable<YouthAcademyProjection["academy"]>;

/** Empty state offering academy construction. */
export function BuildAcademyCard({ cash, onBuild }: { cash: number; onBuild: () => void }) {
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
          Build a Youth Academy to develop young prospects before they enter the formal banzuke. A
          level-1 academy can hold up to 3 prospects.
        </p>
        <div className="flex items-center justify-between">
          <span className="text-sm tabular-nums">
            Cost:{" "}
            <span className={canAfford ? "text-foreground" : "text-destructive"}>
              {buildCost.toLocaleString()}
            </span>
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

/** Staff roster + hire buttons. */
export function StaffSection({
  academy,
  cash,
  onHireStaff,
}: {
  academy: Academy;
  cash: number;
  onHireStaff: (role: AcademyStaffRole) => void;
}) {
  const a = academy;
  const hireCost = 100_000;
  const canAffordStaff = cash >= hireCost;
  const filledRoles = new Set(a.staff.map((s) => s.role));
  const canHireMore = a.staff.length < a.maxStaff;

  return (
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
        <p className="text-[10px] text-muted-foreground">
          Staff capacity reached for this level.
        </p>
      )}
    </div>
  );
}

/** Current prospects with promote buttons. */
export function ProspectsSection({
  academy,
  onPromote,
}: {
  academy: Academy;
  onPromote: (prospectId: string) => void;
}) {
  const a = academy;
  if (a.prospects.length === 0) return null;

  return (
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
  );
}

/** Investment quick-buttons. */
export function InvestSection({
  cash,
  onInvest,
}: {
  cash: number;
  onInvest: (amount: number) => void;
}) {
  return (
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
  );
}

/** Upgrade footer or max-level note. */
export function UpgradeSection({
  academy,
  cash,
  canUpgrade,
  upgradeCost,
  onUpgrade,
}: {
  academy: Academy;
  cash: number;
  canUpgrade: boolean;
  upgradeCost: number;
  onUpgrade: () => void;
}) {
  const a = academy;
  const canAffordUpgrade = cash >= upgradeCost;

  if (!canUpgrade) {
    return (
      <div className="text-xs text-muted-foreground text-center pt-2 border-t border-border/30">
        Academy at maximum level
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between pt-2 border-t border-border/30">
      <div className="flex items-center gap-2">
        <ArrowUpCircle className="h-4 w-4 text-primary" />
        <span className="text-xs">Upgrade to Level {a.level + 1}</span>
        <span className="text-sm tabular-nums">{upgradeCost.toLocaleString()}</span>
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
  );
}
