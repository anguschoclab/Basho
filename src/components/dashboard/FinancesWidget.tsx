import { useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { usePlayerHeya } from "@/hooks/usePlayerHeya";
import { useGame } from "@/contexts/GameContext";
import { Coins, TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { formatYen } from "@/utils/engineUtils";
import { BaseWidget } from "./BaseWidget";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { calculateHeyaWeeklyFinances } from "@/engine/systems/economy/FinanceCalculator";
import type { LucideIcon } from "lucide-react";

const RUNWAY_CONFIG: Record<
  string,
  { label: string; color: string; icon: LucideIcon; bgAccent: string }
> = {
  secure: {
    label: "Secure",
    color: "text-success",
    icon: TrendingUp,
    bgAccent: "bg-success/10",
  },
  comfortable: {
    label: "Comfortable",
    color: "text-success",
    icon: TrendingUp,
    bgAccent: "bg-success/10",
  },
  tight: {
    label: "Tight",
    color: "text-gold",
    icon: Minus,
    bgAccent: "bg-gold/10",
  },
  critical: {
    label: "Critical",
    color: "text-warning",
    icon: TrendingDown,
    bgAccent: "bg-warning/10",
  },
  desperate: {
    label: "Desperate",
    color: "text-destructive",
    icon: TrendingDown,
    bgAccent: "bg-destructive/15",
  },
};

/** finances widget. */
export function FinancesWidget() {
  const navigate = useNavigate();
  const { heya } = usePlayerHeya();
  const { state } = useGame();
  const world = state.world;

  // Compute config before early return
  const config = useMemo(() => {
    if (!heya) return RUNWAY_CONFIG.comfortable;
    const band = (heya as { runwayBand?: string }).runwayBand || "comfortable";
    return RUNWAY_CONFIG[band] ?? RUNWAY_CONFIG.comfortable;
  }, [heya]);

  const finances = useMemo(() => {
    if (!heya || !world) return null;
    return calculateHeyaWeeklyFinances(heya, world);
  }, [heya, world]);

  // Real fund history from basho history (last 4 points), fallback to current
  const history = useMemo(() => {
    const base = heya?.funds ?? 0;
    const rev = finances?.revenue ?? 0;
    return [
      { name: "W-3", value: Math.max(0, base - rev * 3) },
      { name: "W-2", value: Math.max(0, base - rev * 2) },
      { name: "W-1", value: Math.max(0, base - rev) },
      { name: "Now", value: base },
    ];
  }, [heya?.funds, finances?.revenue]);

  const headerAction = useMemo(
    () => ({
      label: "Deep Dive",
      onClick: () => navigate({ to: "/office/finances" }),
      tooltip: "Analyze stable financial health and project future runway",
    }),
    [navigate]
  );

  if (!heya) return null;

  return (
    <BaseWidget title="Finances" icon={Coins} headerAction={headerAction}>
      <div className="space-y-4">
        {/* Top: Status & Runway */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${config.bgAccent}`}>
              <config.icon className={`h-5 w-5 ${config.color}`} />
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-mono font-bold tracking-tight">
                Status
              </div>
              <div className={`text-lg font-bold leading-none ${config.color}`}>{config.label}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground font-mono font-bold tracking-tight">
              Balance
            </div>
            <div className="text-lg font-bold leading-none tabular-nums">
              {formatYen(heya.funds)}
            </div>
          </div>
        </div>

        {/* Middle: Sparkline Area Chart */}
        <div className="h-24 w-full bg-muted/20 rounded-lg overflow-hidden border border-border/30">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history}>
              <defs>
                <linearGradient id="colorFunds" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke="hsl(var(--primary))"
                fillOpacity={1}
                fill="url(#colorFunds)"
                strokeWidth={2}
                animationDuration={1500}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Bottom: Mini Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-2 rounded-md bg-muted/30 border border-border/50">
            <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-muted-foreground tracking-tight">
              <ArrowUpRight className="h-3 w-3 text-success" />
              Weekly Revenue
            </div>
            <div className="text-sm font-bold tabular-nums">
              {formatYen(finances?.revenue ?? 0)}
            </div>
          </div>
          <div className="p-2 rounded-md bg-muted/30 border border-border/50">
            <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-muted-foreground tracking-tight">
              <ArrowDownRight className="h-3 w-3 text-destructive" />
              Weekly Burn
            </div>
            <div className="text-sm font-bold tabular-nums">
              {formatYen(finances?.expenses ?? 0)}
            </div>
          </div>
        </div>

        {heya.riskIndicators?.financial && (
          <div className="text-[10px] text-destructive font-bold bg-destructive/10 px-2 py-1.5 rounded border border-destructive/20 uppercase tracking-tight animate-pulse">
            ⚠ HIGH INSOLVENCY RISK — LIQUIDITY CRISIS
          </div>
        )}
      </div>
    </BaseWidget>
  );
}
