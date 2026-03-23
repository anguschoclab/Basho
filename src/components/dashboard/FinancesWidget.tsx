import { useNavigate } from "@tanstack/react-router";
import { useGame } from "@/contexts/GameContext";
import { Coins, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { BaseWidget } from "./BaseWidget";

const RUNWAY_CONFIG: Record<string, { label: string; color: string; icon: any; bgAccent: string }> = {
  secure:      { label: "Secure",      color: "text-primary",        icon: TrendingUp,   bgAccent: "bg-primary/10" },
  comfortable: { label: "Comfortable", color: "text-primary/80",     icon: TrendingUp,   bgAccent: "bg-primary/8" },
  tight:       { label: "Tight",       color: "text-warning",        icon: Minus,         bgAccent: "bg-warning/10" },
  critical:    { label: "Critical",    color: "text-destructive/80", icon: TrendingDown,  bgAccent: "bg-destructive/10" },
  desperate:   { label: "Desperate",   color: "text-destructive",    icon: TrendingDown,  bgAccent: "bg-destructive/15" },
};

/** finances widget. */
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
    <BaseWidget
      title="Finances"
      icon={Coins}
      headerAction={{ label: "Details", onClick: () => navigate({ to: "/economy" }) }}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-xl ${config.bgAccent}`}>
          <Icon className={`h-6 w-6 ${config.color}`} />
        </div>
        <div>
          <div className={`text-xl font-display font-bold ${config.color}`}>{config.label}</div>
          <div className="text-[11px] text-muted-foreground">Financial runway</div>
        </div>
      </div>

      {/* Visual runway gauge */}
      <div className="flex gap-0.5">
        {["desperate", "critical", "tight", "comfortable", "secure"].map((level, i) => (
          <div
            key={level}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              ["desperate", "critical", "tight", "comfortable", "secure"].indexOf(band) >= i
                ? i <= 1 ? "bg-destructive" : i === 2 ? "bg-warning" : "bg-primary"
                : "bg-muted"
            }`}
          />
        ))}
      </div>

      {heya.riskIndicators?.financial && (
        <div className="text-xs text-destructive font-medium bg-destructive/10 px-2.5 py-1.5 rounded-md border border-destructive/20">
          ⚠ High insolvency risk — take action immediately
        </div>
      )}
    </BaseWidget>
  );
}
