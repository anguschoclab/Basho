/**
 * AcademyStaffList — displays academy staff and supports hiring.
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";
import type { AcademyStaff } from "@/engine/types/academy";

const ROLE_LABELS: Record<string, string> = {
  head_coach: "Head Coach",
  conditioning: "Conditioning",
  nutrition: "Nutrition",
  technique: "Technique",
};

interface AcademyStaffListProps {
  staff: AcademyStaff[];
  maxStaff: number;
  onHire?: (role: AcademyStaff["role"]) => void;
}

export function AcademyStaffList({ staff, maxStaff, onHire }: AcademyStaffListProps) {
  const filledRoles = new Set(staff.map((s) => s.role));
  const availableRoles: AcademyStaff["role"][] = ["head_coach", "conditioning", "nutrition", "technique"];

  return (
    <div className="space-y-2" data-testid="academy-staff-list">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Users className="h-3.5 w-3.5" />
        <span>Staff ({staff.length}/{maxStaff})</span>
      </div>
      {staff.map((s) => (
        <div key={s.id} className="flex items-center justify-between text-xs">
          <span>{ROLE_LABELS[s.role] ?? s.role}</span>
          <div className="flex items-center gap-2">
            <span className="font-mono text-muted-foreground">{s.name}</span>
            <Badge variant="secondary" className="text-[9px]">Q{s.quality}</Badge>
          </div>
        </div>
      ))}
      {onHire && staff.length < maxStaff &&
        availableRoles
          .filter((r) => !filledRoles.has(r))
          .map((role) => (
            <Button
              key={role}
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => onHire(role)}
              data-testid={`hire-staff-${role}`}
            >
              Hire {ROLE_LABELS[role] ?? role}
            </Button>
          ))}
    </div>
  );
}
