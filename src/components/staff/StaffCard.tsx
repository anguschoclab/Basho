/**
 * StaffCard.tsx
 *
 * Single staff member card — identity header with fire confirmation,
 * competence/reputation/loyalty/tenure bands, and fatigue/scandal bars.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { TooltipWrap } from "@/components/ui/tooltip-wrap";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { ShieldCheck, Zap, Heart, Award, Briefcase, Trash2 } from "lucide-react";
import type { Staff } from "@/engine/types/staff";
import { toFatigueBand, toScandalBand } from "@/presenters/engineAccess";
import { FATIGUE_LABELS, SCANDAL_LABELS } from "@/constants/ui/labels";
import { STAFF_BAND_COLORS, ROLE_LABELS, staffBonusText } from "./staffMeta";

/** Fire button + permanent-removal confirmation dialog. */
function FireButton({ staff, onFire }: { staff: Staff; onFire: (id: string) => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity focus-visible:opacity-100 focus-visible:ring-2"
          aria-label={`Fire ${staff.name}`}
          tooltip={`Fire ${staff.name}`}
          tooltipSide="top"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently remove {staff.name} from your stable. You cannot undo this action.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => onFire(staff.id)}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Fire {staff.name}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Competence / reputation / loyalty / tenure band grid. */
function BandStats({ staff, primaryColor }: { staff: Staff; primaryColor: string }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-3">
        <TooltipWrap content={staffBonusText(staff)}>
          <div className="space-y-1 cursor-help">
            <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-70 flex items-center gap-1.5">
              <Zap className="h-3 w-3" /> Competence
            </span>
            <div className={cn("text-xs font-bold leading-none", primaryColor)}>
              {staff.competenceBands.primary.toUpperCase()}
            </div>
          </div>
        </TooltipWrap>
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-70 flex items-center gap-1.5">
            <Award className="h-3 w-3" /> Reputation
          </span>
          <div
            className={cn(
              "text-xs font-bold leading-none",
              STAFF_BAND_COLORS[staff.reputationBand.toLowerCase()]
            )}
          >
            {staff.reputationBand.toUpperCase()}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-70 flex items-center gap-1.5">
            <Heart className="h-3 w-3" /> Loyalty
          </span>
          <div
            className={cn(
              "text-xs font-bold leading-none",
              STAFF_BAND_COLORS[staff.loyaltyBand.toLowerCase()]
            )}
          >
            {staff.loyaltyBand.toUpperCase()}
          </div>
        </div>
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-70 flex items-center gap-1.5">
            <ShieldCheck className="h-3 w-3" /> Tenure
          </span>
          <div className="text-xs font-bold leading-none">{staff.yearsAtBeya} YEARS</div>
        </div>
      </div>
    </div>
  );
}

/** Fatigue and scandal-exposure progress bars. */
function VitalsBars({ staff }: { staff: Staff }) {
  return (
    <div className="grid grid-cols-2 gap-6 pt-1">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          <span>Fatigue</span>
          <span
            className={cn(
              toFatigueBand(staff.fatigue) === "spent" ||
                toFatigueBand(staff.fatigue) === "exhausted" ||
                toFatigueBand(staff.fatigue) === "worn"
                ? "text-destructive"
                : "text-foreground"
            )}
          >
            {FATIGUE_LABELS[toFatigueBand(staff.fatigue)]}
          </span>
        </div>
        <Progress value={staff.fatigue} className="h-1" />
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          <span>Scandal</span>
          <span className={cn(staff.scandalExposure > 50 ? "text-warning" : "text-foreground")}>
            {SCANDAL_LABELS[toScandalBand(staff.scandalExposure)]}
          </span>
        </div>
        <Progress value={staff.scandalExposure} className="h-1" />
      </div>
    </div>
  );
}

export function StaffCard({ staff, onFire }: { staff: Staff; onFire: (id: string) => void }) {
  const primaryColor =
    STAFF_BAND_COLORS[staff.competenceBands.primary.toLowerCase()] || "text-muted-foreground";

  return (
    <Card className="paper relative overflow-hidden group">
      <div
        className={cn("absolute top-0 left-0 w-1 h-full", primaryColor.replace("text-", "bg-"))}
      />
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center border border-border/50">
              <Briefcase className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-lg">{staff.name}</CardTitle>
              <CardDescription className="font-bold uppercase tracking-tighter text-[10px] text-primary/80">
                {ROLE_LABELS[staff.role]}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[10px] capitalize">
              {staff.careerPhase}
            </Badge>
            {staff.role !== "oyakata" && <FireButton staff={staff} onFire={onFire} />}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <BandStats staff={staff} primaryColor={primaryColor} />

        <Separator className="bg-border/30" />

        <VitalsBars staff={staff} />
      </CardContent>
    </Card>
  );
}
