import { useNavigate } from "react-router-dom";
import { useGame } from "@/contexts/GameContext";
import { Button } from "@/components/ui/button";
import { Coins, ChevronRight, TrendingUp, TrendingDown, Minus } from "lucide-react";

const RUNWAY_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  secure:      { label: "Secure",      color: "text-primary",          icon: TrendingUp },
  comfortable: { label: "Comfortable", color: "text-primary/80",       icon: TrendingUp },
  tight:       { label: "Tight",       color: "text-warning",          icon: Minus },
  critical:    { label: "Critical",    color: "text-destructive/80",   icon: TrendingDown },
  desperate:   { label: "Desperate",   color: "text-destructive",      icon: TrendingDown },
};

export function FinancesWidget() {
  const { state } = useGame();
  const navigate = useNavigate();
  const world = state.world;
  if (!world?.playerHeyaId) return null;

  const heya = world.heyas.get(world.playerHeyaId);
  if (!heya) return null;

  const band = (heya as any).runwayBand || "comfortable";
  const config = RUNWAY_CONFIG[band] ?? RUNWAY_CONFIG.comfortable;
  const Icon = config.icon;

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Coins className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Finances</span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate("/economy")} className="h-6 text-xs gap-1 text-muted-foreground">
          Details <ChevronRight className="h-3 w-3" />
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg bg-muted/50 ${config.color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className={`text-xl font-bold ${config.color}`}>{config.label}</div>
          <div className="text-xs text-muted-foreground">Financial runway</div>
        </div>
      </div>

      {heya.riskIndicators?.financial && (
        <div className="text-xs text-destructive font-medium bg-destructive/10 px-2 py-1 rounded">
          ⚠ High insolvency risk
        </div>
      )}
    </div>
  );
}
