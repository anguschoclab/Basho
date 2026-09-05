/**
 * AcademyWidget — dashboard widget showing youth academy status.
 * Shows next intake countdown and top prospect.
 */
import { GraduationCap } from "lucide-react";
import { BaseWidget } from "./BaseWidget";
import type { YouthAcademyProjection } from "@/presenters/youthAcademyProjections";

interface AcademyWidgetProps {
  projection: YouthAcademyProjection;
  currentYear: number;
}

export function AcademyWidget({ projection, currentYear }: AcademyWidgetProps) {
  if (!projection.academy) {
    return (
      <BaseWidget title="Youth Academy" icon={GraduationCap}>
        <p className="text-xs text-muted-foreground">
          No youth academy built. Visit the Stable page to build one.
        </p>
      </BaseWidget>
    );
  }

  const academy = projection.academy;
  const yearsSinceIntake = currentYear - academy.lastIntakeYear;
  const nextIntakeYear = academy.lastIntakeYear + 1;
  const weeksToIntake = Math.max(0, (nextIntakeYear - currentYear) * 48);
  const topProspect = academy.prospects[0];

  return (
    <BaseWidget title="Youth Academy" icon={GraduationCap}>
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Level</span>
          <span className="font-mono font-bold">{academy.level}/{academy.maxLevel}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Prospects</span>
          <span className="font-mono">{academy.prospectCount}/{academy.maxProspects}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Graduated</span>
          <span className="font-mono">{academy.totalGraduated}</span>
        </div>
        {yearsSinceIntake >= 1 && (
          <div className="text-xs text-muted-foreground">
            Next intake: Year {nextIntakeYear} ({weeksToIntake} weeks)
          </div>
        )}
        {topProspect && (
          <div className="text-xs">
            <span className="text-muted-foreground">Top prospect: </span>
            <span className="font-medium">{topProspect.shikona}</span>
            <span className="text-muted-foreground"> (POT {topProspect.potential})</span>
          </div>
        )}
      </div>
    </BaseWidget>
  );
}
