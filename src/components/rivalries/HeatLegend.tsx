/**
 * HeatLegend.tsx
 *
 * Heat legend for rivalry page.
 */

import { HEAT_BAND_CONFIG } from "./rivalryConstants";
import type { RivalryHeatBand } from "@/engine/rivalries";

export function HeatLegend() {
  return (
    <div className="flex items-center gap-4 text-[10px] text-muted-foreground border border-border/50 rounded-md px-3 py-2 bg-muted/20 w-fit flex-wrap">
      {(["legendary", "fierce", "heated", "simmering", "dormant"] as RivalryHeatBand[]).map(
        (band) => {
          const c = HEAT_BAND_CONFIG[band];
          return (
            <span key={band} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-full ${c.bgColor} border`} />
              <span className={c.color}>{c.label}</span>
            </span>
          );
        }
      )}
    </div>
  );
}
