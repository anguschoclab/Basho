import React, { useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useGame } from "@/contexts/GameContext";
import { usePlayerHeya } from "@/hooks/usePlayerHeya";
import { Progress } from "@/components/ui/progress";
import { Building, Bed, ChefHat, AlertTriangle, Wrench } from "lucide-react";
import { BaseWidget } from "./BaseWidget";
import {
  getFacilityLevelColor,
  getFacilityLevelLabel,
  getMonthlyMaintenanceCost,
} from "@/presenters/uiDigest";

const AXIS_ICONS = {
  training: Building,
  recovery: Bed,
  nutrition: ChefHat,
} as const;

const AXIS_LABELS = {
  training: "Training",
  recovery: "Recovery",
  nutrition: "Nutrition",
} as const;

const AXES = ["training", "recovery", "nutrition"] as const;

const FacilityAxisRow = React.memo(
  ({ axis, level }: { axis: (typeof AXES)[number]; level: number }) => {
    const Icon = AXIS_ICONS[axis];
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground">
              {AXIS_LABELS[axis]}
            </span>
          </div>
          <span
            className={`text-[10px] font-medium ${getFacilityLevelColor(level)}`}
          >
            {getFacilityLevelLabel(level)}
          </span>
        </div>
        <Progress value={level} className="h-1.5" />
      </div>
    );
  },
);

/** facilities widget. */
export function FacilitiesWidget() {
  const navigate = useNavigate();
  const headerAction = useMemo(() => ({
    label: "Manage",
    onClick: () => navigate({ to: "/stable" as any })
  }), [navigate]);
  const { heya } = usePlayerHeya();

  if (!heya) return null;

  const maintenance = getMonthlyMaintenanceCost(heya);
  const canAfford = heya.funds >= maintenance;

  const { atRisk, lowestAxis, lowestLevel, isLow } = useMemo(() => {
    const atRisk = !canAfford;
    const lowestAxis = AXES.reduce(
      (low, a) => (heya.facilities[a] < heya.facilities[low] ? a : low),
      AXES[0],
    );
    const lowestLevel = heya.facilities[lowestAxis];
    const isLow = lowestLevel <= 25;
    return { atRisk, lowestAxis, lowestLevel, isLow };
  }, [canAfford, heya.facilities]);

  return (
    <BaseWidget
      title="Facilities"
      icon={Wrench}
      className={
        atRisk ? "border-destructive/40 ring-1 ring-destructive/20" : ""
      }
      iconClassName={atRisk ? "text-destructive" : ""}
      headerContent={
        <>
          {atRisk && (
            <span className="flex items-center gap-1 text-[10px] font-medium text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-full">
              <AlertTriangle className="h-2.5 w-2.5" />
              At Risk
            </span>
          )}
          {!atRisk && isLow && (
            <span className="text-[10px] font-medium text-warning bg-warning/10 px-1.5 py-0.5 rounded-full">
              Low
            </span>
          )}
        </>
      }
      headerAction={headerAction}
    >
      <div className="space-y-2.5">
        {AXES.map((axis) => (
          <FacilityAxisRow
            key={axis}
            axis={axis}
            level={heya.facilities[axis]}
          />
        ))}
      </div>

      <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-2 border-t border-border/50">
        <span>Monthly upkeep</span>
        <span
          className={`font-mono ${!canAfford ? "text-destructive font-semibold" : ""}`}
        >
          ¥{maintenance.toLocaleString()}
        </span>
      </div>

      {atRisk && (
        <div className="flex items-center gap-1.5 text-[10px] text-destructive bg-destructive/10 px-2.5 py-1.5 rounded-md border border-destructive/20">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          <span>Funds won't cover maintenance — facilities will decay</span>
        </div>
      )}
    </BaseWidget>
  );
}
