import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Building,
  Bed,
  ChefHat,
  TrendingUp,
  Wrench,
  AlertTriangle,
  Coins,
  ArrowUp,
} from "lucide-react";
import type { Heya } from "@/engine/types/heya";
import type { WorldState } from "@/engine/types/world";
import type { FacilitiesBand } from "@/engine/types/narrative";
import {
  getUpgradeCostEstimate,
  getMonthlyMaintenanceCost,
  type FacilityAxis,
  type UpgradeResult,
} from "@/engine/facilities";
import { getHeyaFacilitiesSummary } from "@/engine/uiDigest";
import { STAT_BAND_LABELS } from "@/engine/descriptorBands";

const AXIS_META: Record<FacilityAxis, { label: string; icon: typeof Building; description: string; effectLabel: string }> = {
  training: {
    label: "Training Dohyo",
    icon: Building,
    description: "Quality of practice facilities. Higher levels boost stat growth for all wrestlers.",
    effectLabel: "Stat growth bonus",
  },
  recovery: {
    label: "Recovery Center",
    icon: Bed,
    description: "Medical and rehab equipment. Higher levels reduce injury risk and speed up recovery.",
    effectLabel: "Recovery speed & injury prevention",
  },
  nutrition: {
    label: "Kitchen & Chanko",
    icon: ChefHat,
    description: "Nutrition program quality. Higher levels boost strength and stamina gains.",
    effectLabel: "Strength & stamina bonus",
  },
};

const BAND_COLORS: Record<FacilitiesBand, string> = {
  world_class: "text-amber-400",
  excellent: "text-purple-400",
  adequate: "text-blue-400",
  basic: "text-orange-400",
  minimal: "text-red-400",
};

const BAND_LABELS: Record<FacilitiesBand, string> = {
  world_class: "World-Class",
  excellent: "Excellent",
  adequate: "Adequate",
  basic: "Basic",
  minimal: "Minimal",
};

/** Defines the structure for facilities management panel props. */
interface FacilitiesManagementPanelProps {
  heya: Heya;
  world: WorldState;
  isOwner: boolean;
  onUpgrade: (axis: FacilityAxis, points: number) => UpgradeResult | undefined;
}

/**
 * facilities management panel.
 *  * @param { heya, world, isOwner, onUpgrade } - The { heya, world, is owner, on upgrade }.
 */
export function FacilitiesManagementPanel({ heya, world, isOwner, onUpgrade }: FacilitiesManagementPanelProps) {
  const [lastResult, setLastResult] = useState<UpgradeResult | null>(null);

  const monthlyMaintenance = useMemo(() => getMonthlyMaintenanceCost(heya), [heya.facilities]);

  const axes: FacilityAxis[] = ["training", "recovery", "nutrition"];

  const handleUpgrade = (axis: FacilityAxis, points: number) => {
    const result = onUpgrade(axis, points);
    if (result) setLastResult(result);
  };

  const summary = getHeyaFacilitiesSummary(heya);
  if (!summary) return null;

  return (
    <>
      {/* Overall band */}
      <Card className="paper">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Facilities Overview
              </CardTitle>
              <CardDescription>
                Overall: <span className={`font-semibold ${BAND_COLORS[heya.facilitiesBand]}`}>
                  {BAND_LABELS[heya.facilitiesBand]}
                </span>
              </CardDescription>
            </div>
            <div className="text-right text-sm">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Coins className="h-3.5 w-3.5" />
                Monthly Upkeep
              </div>
              <span className="font-mono text-foreground">¥{monthlyMaintenance.toLocaleString()}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Facilities influence training gains, injury recovery, and nutrition quality.
            They decay monthly if maintenance costs aren't covered. Invest to improve — costs scale with level.
          </p>
          {heya.funds < monthlyMaintenance && (
            <div className="mt-3 flex items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <span>Warning: Current funds may not cover monthly maintenance. Facilities will degrade.</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Feedback toast */}
      {lastResult && (
        <div className={`p-3 rounded-lg border text-sm ${
          lastResult.success 
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
            : "bg-destructive/10 border-destructive/30 text-destructive"
        }`}>
          {lastResult.success
            ? `Upgraded ${lastResult.axis} from ${lastResult.oldLevel} → ${lastResult.newLevel} for ¥${lastResult.cost.toLocaleString()}`
            : `Cannot upgrade: ${lastResult.reason}`}
        </div>
      )}

      {/* Per-axis cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {axes.map((axis) => {
          const meta = AXIS_META[axis];
          const Icon = meta.icon;
          const band = summary[`${axis}Band`];
          const cost5 = getUpgradeCostEstimate(heya, axis, 5);
          const cost1 = getUpgradeCostEstimate(heya, axis, 1);
          const canAfford5 = heya.funds >= cost5;
          const canAfford1 = heya.funds >= cost1;
          const atMax = summary.isMaxed[axis];

          return (
            <Card key={axis} className="paper">
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
                    <span className={`text-sm font-semibold capitalize`}>
                      {STAT_BAND_LABELS[band as keyof typeof STAT_BAND_LABELS] ?? band}
                    </span>
                  </div>
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
                      onClick={() => handleUpgrade(axis, 1)}
                    >
                      <ArrowUp className="h-3 w-3" />
                      +1 (¥{cost1.toLocaleString()})
                    </Button>
                    <Button
                      size="sm"
                      variant="default"
                      className="flex-1 text-xs gap-1"
                      disabled={!canAfford5}
                      onClick={() => handleUpgrade(axis, 5)}
                    >
                      <ArrowUp className="h-3 w-3" />
                      +5 (¥{cost5.toLocaleString()})
                    </Button>
                  </div>
                )}

                {isOwner && atMax && (
                  <Badge variant="secondary" className="text-xs">Maxed Out</Badge>
                )}

                {!isOwner && (
                  <p className="text-xs text-muted-foreground italic">Viewing only</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Info card */}
      <Card className="paper">
        <CardHeader>
          <CardTitle className="text-sm">How Facilities Work</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1">
          <p>• <strong>Training Dohyo</strong> directly multiplies all weekly stat gains for your wrestlers.</p>
          <p>• <strong>Recovery Center</strong> reduces injury chance and speeds up recovery from injuries.</p>
          <p>• <strong>Kitchen & Chanko</strong> boosts strength and stamina development specifically.</p>
          <p>• Facilities <strong>decay by 2 points/month</strong> if you can't afford the maintenance cost.</p>
          <p>• Upgrade costs <strong>scale with level</strong> — higher facilities are exponentially more expensive.</p>
        </CardContent>
      </Card>
    </>
  );
}
