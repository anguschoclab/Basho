import { useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { usePlayerHeya } from "@/hooks/usePlayerHeya";
import { Coins, TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { BaseWidget } from "./BaseWidget";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
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
    color: "text-green-500",
    icon: TrendingUp,
    bgAccent: "bg-green-500/10",
  },
  tight: {
    label: "Tight",
    color: "text-gold",
    icon: Minus,
    bgAccent: "bg-gold/10",
  },
  critical: {
    label: "Critical",
    color: "text-orange-500",
    icon: TrendingDown,
    bgAccent: "bg-orange-500/10",
  },
  desperate: {
    label: "Desperate",
    color: "text-red-500",
    icon: TrendingDown,
    bgAccent: "bg-red-500/15",
  },
};

/** finances widget. */
export function FinancesWidget() {
  const navigate = useNavigate();
  const { heya } = usePlayerHeya();

  // Compute config before early return
  const config = useMemo(() => {
    if (!heya) return RUNWAY_CONFIG.comfortable;
    const band = (heya as any).runwayBand || "comfortable";
    return RUNWAY_CONFIG[band] ?? RUNWAY_CONFIG.comfortable;
  }, [heya]);

  // Mock history for visual flair
  const history = useMemo(
    () => [
      { name: "W1", value: (heya?.funds ?? 0) * 0.8 },
      { name: "W2", value: (heya?.funds ?? 0) * 0.85 },
      { name: "W3", value: (heya?.funds ?? 0) * 0.9 },
      { name: "W4", value: heya?.funds ?? 0 },
    ],
    [heya?.funds]
  );

  const headerAction = useMemo(
    () => ({
      label: "Deep Dive",
      onClick: () => navigate({ to: "/office/finances" as any }),
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
              <div className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
                Status
              </div>
              <div className={`text-lg font-bold leading-none ${config.color}`}>{config.label}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
              Balance
            </div>
            <div className="text-lg font-bold leading-none">¥{heya.funds.toLocaleString()}</div>
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
            <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">
              <ArrowUpRight className="h-3 w-3 text-success" />
              Monthly Revenue
            </div>
            <div className="text-sm font-bold">¥1,250,000</div>
          </div>
          <div className="p-2 rounded-md bg-muted/30 border border-border/50">
            <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">
              <ArrowDownRight className="h-3 w-3 text-red-500" />
              Maintenance
            </div>
            <div className="text-sm font-bold">¥450,000</div>
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
