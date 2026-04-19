/**
 * KokugikanChart.tsx
 * =================
 * Base chart wrapper with Kokugikan Noir styling.
 * Provides consistent colors, typography, and animations.
 */

import { ReactElement } from "react";
import { ResponsiveContainer, TooltipProps } from "recharts";
import { cn } from "@/lib/utils";

interface KokugikanChartProps {
  children: ReactElement;
  height?: number;
  className?: string;
}

/** Chart tooltip with card styling */
function ChartTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-card border border-border rounded-lg p-2 shadow-lg">
      <div className="text-[10px] font-mono font-bold uppercase tracking-tight text-muted-foreground">
        {label}
      </div>
      {payload.map((entry, index) => (
        <div key={index} className="text-xs font-medium mt-1">
          <span
            className="inline-block w-2 h-2 rounded-full mr-2"
            style={{ backgroundColor: entry.color }}
          />
          {entry.name}: {entry.value}
        </div>
      ))}
    </div>
  );
}

export function KokugikanChart({ children, height = 200, className }: KokugikanChartProps) {
  return (
    <div
      className={cn("w-full animate-in fade-in slide-in-from-bottom-2 duration-800", className)}
      style={{ height }}
    >
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

export { ChartTooltip };
