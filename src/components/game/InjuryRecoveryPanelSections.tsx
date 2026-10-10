/**
 * InjuryRecoveryPanelSections.tsx
 *
 * Sections of InjuryRecoveryPanel — facility overview card, one injured
 * rikishi card, and the withdrawal-confirmation dialog.
 */

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RikishiName } from "@/components/ClickableName";
import { Heart, Activity, AlertTriangle, Clock, Thermometer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import type { projectMedicalUIDigest } from "@/presenters/uiDigest";
import { getSeverityColor, getSeverityBadge } from "./severityHelpers";
import { GomenfudaStatusBadge } from "./GomenfudaStatusBadge";
import type { projectGomenfuda } from "@/presenters/projections/governanceProjections";

type Digest = NonNullable<ReturnType<typeof projectMedicalUIDigest>>;
type InjuredInfo = Digest["injuredRikishi"][number];
type GomenfudaProjection = ReturnType<typeof projectGomenfuda>;

/** Recovery facility overview card. */
export function RecoveryFacilityCard({
  facilityLevel,
  facilityLabel,
}: {
  facilityLevel: number;
  facilityLabel: string;
}) {
  return (
    <Card className="border-primary/20">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Recovery Facilities</span>
          </div>
          <Badge variant="outline">{facilityLabel}</Badge>
        </div>
        <Progress value={facilityLevel} className="h-2" />
        <p className="text-xs text-muted-foreground mt-2">
          {facilityLevel >= 70
            ? "Your recovery facilities accelerate healing. Injured wrestlers return faster."
            : facilityLevel >= 40
              ? "Standard recovery support. Invest in facilities to speed up rehabilitation."
              : "Basic recovery only. Upgrading facilities would significantly reduce injury downtime."}
        </p>
      </CardContent>
    </Card>
  );
}

/** One injured rikishi card — severity, progress, treat/withdraw actions. */
export function InjuredRikishiCard({
  info,
  gomenfudaProjection,
  onTreat,
  onWithdraw,
}: {
  info: InjuredInfo;
  gomenfudaProjection: GomenfudaProjection | null;
  onTreat: (rikishiId: string) => void;
  onWithdraw: (rikishiId: string) => void;
}) {
  return (
    <Card className="paper">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-display font-semibold">
                <RikishiName id={info.id} name={info.shikona} />
              </h4>
              <Badge
                variant="outline"
                className="border-west text-west bg-west/10 font-bold text-[10px] tracking-widest"
              >
                Recovering
              </Badge>
              {getSeverityBadge(info.severity)}
            </div>

            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Activity className="h-3 w-3" />
                {info.location.charAt(0).toUpperCase() + info.location.slice(1)} injury
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {info.weeksRemaining} week{info.weeksRemaining !== 1 ? "s" : ""} remaining
              </span>
            </div>

            <div className="mt-3">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">Recovery Progress</span>
                <span className="font-mono">{info.recoveryProgress}%</span>
              </div>
              <Progress value={info.recoveryProgress} className="h-2" />
            </div>

            {info.facilityBonus > 0 && (
              <p className="text-xs text-success mt-2 flex items-center gap-1">
                <Thermometer className="h-3 w-3" />
                Recovery facilities providing healing bonus
              </p>
            )}
            {info.facilityBonus < 0 && (
              <p className="text-xs text-gold mt-2 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Poor facilities slowing recovery
              </p>
            )}

            <div className="mt-2 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => onTreat(info.id)}>
                Treat 1wk (¥500k)
              </Button>
              {!info.isKyujo && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onWithdraw(info.id)}
                    data-testid={`withdraw-btn-${info.id}`}
                  >
                    Withdraw
                  </Button>
                  {gomenfudaProjection && <GomenfudaStatusBadge projection={gomenfudaProjection} />}
                </>
              )}
            </div>
          </div>

          <div
            className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 ${
              info.severity === "serious"
                ? "bg-destructive/10"
                : info.severity === "moderate"
                  ? "bg-gold/10"
                  : "bg-gold/10"
            }`}
          >
            <AlertTriangle className={`h-5 w-5 ${getSeverityColor(info.severity)}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/** Withdrawal confirmation dialog with gomenfuda sanction preview. */
export function WithdrawalDialog({
  pendingRikishi,
  open,
  onOpenChange,
  gomenfudaCount,
  sanctionThreshold,
  sanctionRiskPercent,
  onConfirm,
}: {
  pendingRikishi: InjuredInfo | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gomenfudaCount: number;
  sanctionThreshold: number;
  sanctionRiskPercent: number;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Withdrawal</DialogTitle>
          <DialogDescription>
            Withdrawing {pendingRikishi?.shikona ?? "this rikishi"} will post a gomenfuda
            (withdrawal apology). Three gomenfuda in a calendar year trigger JSA sanctions.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Gomenfuda this year:</span>
            <span className="font-mono font-bold" data-testid="gomenfuda-count-display">
              {gomenfudaCount}/{sanctionThreshold}
            </span>
          </div>
          {gomenfudaCount >= sanctionThreshold - 1 && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <span data-testid="sanction-warning">
                Sanction risk: {sanctionRiskPercent}% — withdrawing will trigger JSA sanctions!
              </span>
            </div>
          )}
          {gomenfudaCount < sanctionThreshold - 1 && (
            <p className="text-xs text-muted-foreground">Sanction risk: {sanctionRiskPercent}%</p>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button variant="destructive" data-testid="confirm-withdraw" onClick={onConfirm}>
            Confirm Withdrawal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
