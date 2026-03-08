import { useNavigate } from "react-router-dom";
import { useGame } from "@/contexts/GameContext";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Building, ChevronRight, Bed, ChefHat, AlertTriangle, Wrench } from "lucide-react";
import { getMonthlyMaintenanceCost } from "@/engine/facilities";

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

function getLevelLabel(level: number): string {
  if (level >= 85) return "World-Class";
  if (level >= 65) return "Excellent";
  if (level >= 45) return "Adequate";
  if (level >= 25) return "Basic";
  return "Minimal";
}

function getLevelColor(level: number): string {
  if (level >= 85) return "text-amber-400";
  if (level >= 65) return "text-purple-400";
  if (level >= 45) return "text-blue-400";
  if (level >= 25) return "text-orange-400";
  return "text-red-400";
}

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

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wrench className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Facilities</span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate("/stable")} className="h-6 text-xs gap-1 text-muted-foreground">
          Manage <ChevronRight className="h-3 w-3" />
        </Button>
      </div>

      <div className="space-y-2">
        {axes.map((axis) => {
          const Icon = AXIS_ICONS[axis];
          const level = heya.facilities[axis];
          return (
            <div key={axis} className="flex items-center gap-2">
              <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-[11px] text-muted-foreground w-16 shrink-0">{AXIS_LABELS[axis]}</span>
              <Progress value={level} className="h-1.5 flex-1" />
              <span className={`text-[10px] font-medium w-20 text-right ${getLevelColor(level)}`}>
                {getLevelLabel(level)}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border">
        <span>Monthly upkeep</span>
        <span className="font-mono">¥{maintenance.toLocaleString()}</span>
      </div>

      {!canAfford && (
        <div className="flex items-center gap-1.5 text-[10px] text-destructive bg-destructive/10 px-2 py-1 rounded">
          <AlertTriangle className="h-3 w-3" />
          <span>Can't cover maintenance — facilities will decay</span>
        </div>
      )}
    </div>
  );
}
