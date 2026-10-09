/**
 * YouthAcademyPanel — player control for the youth academy.
 *
 * Lets the player build, upgrade, invest, hire staff, promote prospects,
 * and view their youth academy development pipeline.
 * Section components live in ./YouthAcademyPanelSections.tsx.
 */
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GraduationCap } from "lucide-react";
import type { YouthAcademyProjection } from "@/presenters/youthAcademyProjections";
import type { AcademyStaffRole } from "@/engine/types/academy";
import {
  BuildAcademyCard,
  StaffSection,
  ProspectsSection,
  InvestSection,
  UpgradeSection,
} from "./YouthAcademyPanelSections";

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
    return <BuildAcademyCard cash={cash} onBuild={onBuild} />;
  }

  const { academy, canUpgrade, upgradeCost } = projection;
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

        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="p-2 rounded bg-muted/20">
            <div className="text-muted-foreground">Prospects</div>
            <div className="text-sm font-medium tabular-nums">
              {a.prospectCount}/{a.maxProspects}
            </div>
          </div>
          <div className="p-2 rounded bg-muted/20">
            <div className="text-muted-foreground">Graduated</div>
            <div className="text-sm font-medium tabular-nums">{a.totalGraduated}</div>
          </div>
          <div className="p-2 rounded bg-muted/20">
            <div className="text-muted-foreground">Budget</div>
            <div className="text-sm font-medium tabular-nums">{a.budget.toLocaleString()}</div>
          </div>
        </div>

        {/* Staff section */}
        <StaffSection academy={a} cash={cash} onHireStaff={onHireStaff} />

        {/* Prospects section */}
        <ProspectsSection academy={a} onPromote={onPromote} />

        {/* Invest section */}
        <InvestSection cash={cash} onInvest={onInvest} />

        {/* Upgrade section */}
        <UpgradeSection
          academy={a}
          cash={cash}
          canUpgrade={canUpgrade}
          upgradeCost={upgradeCost}
          onUpgrade={onUpgrade}
        />
      </CardContent>
    </Card>
  );
}
