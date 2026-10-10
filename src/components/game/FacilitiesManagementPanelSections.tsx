/**
 * FacilitiesManagementPanelSections.tsx
 *
 * Sections of FacilitiesManagementPanel — overall band card, upgrade toast,
 * per-axis upgrade card, and the info card.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Wrench, AlertTriangle, Coins, ArrowUp } from "lucide-react";
import type { Heya } from "@/engine/types/heya";
import type { FacilityAxis } from "@/presenters/engineAccess";
import {
  getFacilityLevelColor as getLevelColor,
  getUpgradeCostEstimate,
} from "@/presenters/uiDigest";
import { formatYen } from "@/utils/engineUtils";
import {
  AXIS_META,
  FACILITY_BAND_COLORS,
  BAND_LABELS,
  getLevelBand,
  getEffectPercent,
} from "./facilityMeta";

/** Toast shown after an upgrade lands via WORLD_UPDATED. */
export interface UpgradeToast {
  axis: FacilityAxis;
  oldLevel: number;
  newLevel: number;
  cost: number;
}

/** Overall facilities band card with monthly upkeep. */
export function FacilityOverviewCard({
  heya,
  monthlyMaintenance,
}: {
  heya: Heya;
  monthlyMaintenance: number;
}) {
  return (
    <Card className="paper">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Facilities Overview
            </CardTitle>
            <CardDescription>
              Overall:{" "}
              <span className={`font-semibold ${FACILITY_BAND_COLORS[heya.facilitiesBand]}`}>
                {BAND_LABELS[heya.facilitiesBand]}
              </span>
            </CardDescription>
          </div>
          <div className="text-right text-sm">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Coins className="h-3.5 w-3.5" />
              Monthly Upkeep
            </div>
            <span className="font-mono text-foreground">{formatYen(monthlyMaintenance)}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Facilities influence training gains, injury recovery, and nutrition quality. They decay
          monthly if maintenance costs aren't covered. Invest to improve — costs scale with level.
        </p>
        {heya.funds < monthlyMaintenance && (
          <div className="mt-3 flex items-center gap-2 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <span>
              Warning: Current funds may not cover monthly maintenance. Facilities will degrade.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Transient confirmation shown after a world-diff upgrade lands. */
export function FacilityUpgradeToast({ toast }: { toast: UpgradeToast }) {
  return (
    <div className="p-3 rounded-lg border text-sm bg-success/10 border-success/30 text-success">
      Upgraded {toast.axis} from {toast.oldLevel} → {toast.newLevel} for {formatYen(toast.cost)}
    </div>
  );
}

/** Per-axis upgrade card — level bar, effect, +1/+5 buttons. */
export function FacilityAxisCard({
  heya,
  axis,
  isOwner,
  onUpgrade,
}: {
  heya: Heya;
  axis: FacilityAxis;
  isOwner: boolean;
  onUpgrade: (axis: FacilityAxis, points: number) => void;
}) {
  const meta = AXIS_META[axis];
  const Icon = meta.icon;
  const level = heya.facilities[axis];
  const cost5 = getUpgradeCostEstimate(heya, axis, 5);
  const cost1 = getUpgradeCostEstimate(heya, axis, 1);
  const canAfford5 = heya.funds >= cost5;
  const canAfford1 = heya.funds >= cost1;
  const atMax = level >= 100;

  return (
    <Card className="paper">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-5 w-5 text-muted-foreground" />
          {meta.label}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Level bar */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className={`text-sm font-semibold ${getLevelColor(level)}`}>
              {getLevelBand(level)}
            </span>
            <span className="text-xs font-mono text-muted-foreground">{level}/100</span>
          </div>
          <Progress value={level} className="h-2" />
        </div>

        {/* Effect display */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <TrendingUp className="h-3 w-3" />
          <span>{meta.effectLabel}: </span>
          <span className={`font-medium ${level >= 50 ? "text-success" : "text-foreground"}`}>
            {getEffectPercent(axis, level)}
          </span>
        </div>

        <p className="text-xs text-muted-foreground">{meta.description}</p>

        {/* Upgrade buttons — only for owner */}
        {isOwner && !atMax && (
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 text-xs gap-1"
              disabled={!canAfford1}
              onClick={() => onUpgrade(axis, 1)}
              {...(!canAfford1 ? { tooltip: "Insufficient funds", tooltipSide: "top" } : {})}
            >
              <ArrowUp className="h-3 w-3" />
              +1 ({formatYen(cost1)})
            </Button>
            <Button
              size="sm"
              variant="default"
              className="flex-1 text-xs gap-1"
              disabled={!canAfford5}
              onClick={() => onUpgrade(axis, 5)}
              {...(!canAfford5 ? { tooltip: "Insufficient funds", tooltipSide: "top" } : {})}
            >
              <ArrowUp className="h-3 w-3" />
              +5 ({formatYen(cost5)})
            </Button>
          </div>
        )}

        {isOwner && atMax && (
          <Badge variant="secondary" className="text-xs">
            Maxed Out
          </Badge>
        )}

        {!isOwner && <p className="text-xs text-muted-foreground italic">Viewing only</p>}
      </CardContent>
    </Card>
  );
}

/** Info card explaining facility mechanics. */
export function FacilitiesInfoCard() {
  return (
    <Card className="paper">
      <CardHeader>
        <CardTitle className="text-sm">How Facilities Work</CardTitle>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground space-y-1">
        <p>
          • <strong>Training Dohyo</strong> directly multiplies all weekly stat gains for your
          wrestlers.
        </p>
        <p>
          • <strong>Recovery Center</strong> reduces injury chance and speeds up recovery from
          injuries.
        </p>
        <p>
          • <strong>Kitchen & Chanko</strong> boosts strength and stamina development specifically.
        </p>
        <p>
          • Facilities <strong>decay by 2 points/month</strong> if you can't afford the maintenance
          cost.
        </p>
        <p>
          • Upgrade costs <strong>scale with level</strong> — higher facilities are exponentially
          more expensive.
        </p>
      </CardContent>
    </Card>
  );
}
