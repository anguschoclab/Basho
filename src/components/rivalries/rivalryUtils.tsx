/**
 * rivalryUtils.tsx
 *
 * React components for rivalry display.
 */

import { cn } from "@/lib/utils";
import type { RivalryHeatBand } from "@/presenters/engineAccess";
import { HEAT_BAND_CONFIG } from "../../constants/ui/rivalry";

export function H2HBar({
  aWins,
  bWins,
  aName,
  bName,
}: {
  aWins: number;
  bWins: number;
  aName: string;
  bName: string;
}) {
  const total = aWins + bWins;
  if (total === 0)
    return <div className="text-xs text-muted-foreground text-center py-2">No bouts yet</div>;
  const aPct = (aWins / total) * 100;
  const bPct = (bWins / total) * 100;
  const dominant = aWins > bWins ? "a" : bWins > aWins ? "b" : null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span
          className={cn(
            "font-display font-bold",
            dominant === "a" ? "text-primary" : "text-muted-foreground"
          )}
        >
          {aName}
        </span>
        <span className="font-mono text-[10px] text-muted-foreground">
          {total} bout{total !== 1 ? "s" : ""}
        </span>
        <span
          className={cn(
            "font-display font-bold",
            dominant === "b" ? "text-primary" : "text-muted-foreground"
          )}
        >
          {bName}
        </span>
      </div>
      <div className="flex h-6 rounded-md overflow-hidden border border-border/50">
        <div
          className="bg-primary/80 flex items-center justify-center text-[11px] font-bold text-primary-foreground transition-all"
          style={{ width: `${Math.max(aPct, 8)}%` }}
        >
          {aWins}
        </div>
        <div
          className="bg-muted flex items-center justify-center text-[11px] font-bold text-muted-foreground transition-all"
          style={{ width: `${Math.max(bPct, 8)}%` }}
        >
          {bWins}
        </div>
      </div>
    </div>
  );
}

export function HeatGauge({ heat, band }: { heat: number; band: RivalryHeatBand }) {
  const config = HEAT_BAND_CONFIG[band];
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
          Rivalry Heat
        </span>
        <span className={cn("text-[10px] font-semibold", config.color)}>{Math.round(heat)}%</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", config.barColor)}
          style={{ width: `${heat}%` }}
        />
      </div>
    </div>
  );
}
