/**
 * StaffPageSections.tsx
 *
 * Staff page sections — header summary (monthly cost + count + sort menu)
 * and the dashed recruit-slot card containing the role-select hire dialog.
 */

import { TooltipWrap } from "@/components/ui/tooltip-wrap";
import { SortMenu } from "@/components/ui/SortMenu";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserPlus } from "lucide-react";
import type { StaffRole } from "@/engine/types/staff";
import type { SortDirection } from "@/lib/sortUtils";
import { STAFF_UPKEEP_PER_MEMBER } from "@/constants/engine/economic";
import { ROLE_LABELS, ROLE_DESCRIPTIONS, STAFF_SORT_OPTIONS } from "./staffMeta";

/** Header summary — monthly upkeep, staff count, sort menu. */
export function StaffSummary({
  staffCount,
  onSortChange,
}: {
  staffCount: number;
  onSortChange: (key: string, order: SortDirection) => void;
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest leading-none mb-1">
            Monthly Cost
          </div>
          <div className="text-lg font-bold leading-none">
            ¥{Math.round(staffCount * STAFF_UPKEEP_PER_MEMBER * (52 / 12)).toLocaleString()}
          </div>
        </div>
        <div className="h-10 w-px bg-border/50 mx-2" />
        <div className="text-right">
          <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest leading-none mb-1">
            Staff
          </div>
          <div className="text-lg font-bold leading-none">{staffCount}</div>
        </div>
      </div>
      <SortMenu
        options={STAFF_SORT_OPTIONS}
        storageKey="basho_sort_staff"
        defaultSortKey="name"
        defaultSortOrder="asc"
        onSortChange={onSortChange}
      />
    </div>
  );
}

/** Dashed "Recruit Specialist" slot card + hire dialog with role select. */
export function RecruitSlot({
  isOpen,
  onOpenChange,
  selectedRole,
  onRoleChange,
  onHire,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedRole: StaffRole;
  onRoleChange: (role: StaffRole) => void;
  onHire: () => void;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <TooltipWrap
          content="Hire a new specialist to improve your stable's performance"
          side="top"
        >
          <button
            aria-label="Recruit Specialist"
            className="flex flex-col items-center justify-center p-8 rounded-lg border-2 border-dashed border-border/50 bg-muted/20 hover:bg-muted/30 hover:border-primary/50 transition-all group min-h-[220px]"
          >
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform mb-3">
              <UserPlus className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-bold text-lg">Recruit Specialist</h3>
            <p className="text-xs text-muted-foreground text-center max-w-[200px] mt-1">
              Hire a new specialist to improve stable performance.
            </p>
          </button>
        </TooltipWrap>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Recruit Staff Member</DialogTitle>
          <DialogDescription>
            Hiring a specialist costs ¥500,000 upfront. Choose the role that fits your
            current needs.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Specialty Role</label>
            <Select
              value={selectedRole}
              onValueChange={(v) => onRoleChange(v as StaffRole)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(ROLE_LABELS) as StaffRole[])
                  .filter((r) => r !== "oyakata")
                  .map((role) => (
                    <SelectItem key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
            <p className="text-sm font-medium text-foreground mb-1">
              {ROLE_LABELS[selectedRole]}
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {ROLE_DESCRIPTIONS[selectedRole]}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={onHire} className="w-full">
            Confirm Hire (¥500,000)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
