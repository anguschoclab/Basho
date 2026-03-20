import { useNavigate } from "@tanstack/react-router";
import { useGame } from "@/contexts/GameContext";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Building, ChevronRight, Bed, ChefHat, AlertTriangle, Wrench } from "lucide-react";
import { getMonthlyMaintenanceCost } from "@/engine/facilities";
import { getHeyaFacilitiesSummary } from "@/engine/uiDigest";
import { STAT_BAND_LABELS } from "@/engine/descriptorBands";

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



/** facilities widget. */
export function FacilitiesWidget() {
  const { state } = useGame();
  const navigate = useNavigate();
  const world = state.world;
  if (!world?.playerHeyaId) return null;

  const heya = world.heyas.get(world.playerHeyaId);
  if (!heya) return null;

  const maintenance = getMonthlyMaintenanceCost(heya);
  const canAfford = heya.funds >= maintenance;
  const axes = ["training", "recovery", "nutrition"] as const;

  const summary = getHeyaFacilitiesSummary(heya);
  if (!summary) return null;

  const atRisk = !canAfford;
  const isLow = summary.isLow;

  return (
    <div className={`widget-card p-4 space-y-3 ${
      atRisk ? "border-destructive/40 ring-1 ring-destructive/20" : ""
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wrench className={`h-4 w-4 ${atRisk ? "text-destructive" : "text-primary"}`} />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Facilities</span>
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
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/stable" })} className="h-6 text-xs gap-1 text-muted-foreground">
          Manage <ChevronRight className="h-3 w-3" />
        </Button>
      </div>

      <div className="space-y-2.5">
        {axes.map((axis) => {
          const Icon = AXIS_ICONS[axis];
          const band = summary[`${axis}Band`];
          return (
            <div key={axis} className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-[11px] text-muted-foreground">{AXIS_LABELS[axis]}</span>
                </div>
                <span className={`text-[10px] font-medium capitalize`}>
                  {STAT_BAND_LABELS[band as keyof typeof STAT_BAND_LABELS] ?? band}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-2 border-t border-border/50">
        <span>Monthly upkeep</span>
        <span className={`font-mono ${!canAfford ? "text-destructive font-semibold" : ""}`}>
          ¥{maintenance.toLocaleString()}
        </span>
      </div>

      {atRisk && (
        <div className="flex items-center gap-1.5 text-[10px] text-destructive bg-destructive/10 px-2.5 py-1.5 rounded-md border border-destructive/20">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          <span>Funds won't cover maintenance — facilities will decay</span>
        </div>
      )}
    </div>
  );
}
