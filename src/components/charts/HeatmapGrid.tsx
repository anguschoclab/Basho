/**
 * HeatmapGrid.tsx
 * ===============
 * Matrix heatmap for displaying H2H records or any 2D data.
 */

import { cn } from "@/lib/utils";

interface HeatmapDataPoint {
  x: string;
  y: string;
  value: number;
}

interface HeatmapGridProps {
  data: HeatmapDataPoint[];
  xLabels: string[];
  yLabels: string[];
  colorScale?: "green-red" | "gold-mono" | "east-west" | "blue-red";
  minValue?: number;
  maxValue?: number;
  className?: string;
}

function getColorClass(value: number, min: number, max: number, scale: string): string {
  const normalized = max === min ? 0.5 : (value - min) / (max - min);

  switch (scale) {
    case "green-red":
      if (normalized < 0.25) return "bg-destructive/80";
      if (normalized < 0.5) return "bg-destructive/40";
      if (normalized < 0.75) return "bg-success/40";
      return "bg-success/80";
    case "gold-mono":
      return `bg-[hsl(var(--gold))]/${Math.round(normalized * 100)}`;
    case "east-west":
      return normalized > 0.5 ? "bg-[hsl(var(--east))]/60" : "bg-[hsl(var(--west))]/60";
    case "blue-red":
      return normalized > 0.5 ? "bg-[hsl(var(--east))]/60" : "bg-[hsl(var(--west))]/60";
    default:
      return `bg-primary/${Math.round(normalized * 100)}`;
  }
}

export function HeatmapGrid({
  data,
  xLabels,
  yLabels,
  colorScale = "gold-mono",
  minValue = 0,
  maxValue = 100,
  className,
}: HeatmapGridProps) {
  const dataMap = new Map(data.map((d) => [`${d.x}-${d.y}`, d.value]));

  return (
    <div className={cn("overflow-x-auto", className)}>
      <div className="inline-block min-w-full">
        {/* Header row */}
        <div className="flex">
          <div className="w-20 flex-shrink-0" /> {/* Corner spacer */}
          {xLabels.map((label) => (
            <div
              key={label}
              className="w-10 h-8 flex items-center justify-center text-[9px] font-mono font-bold text-muted-foreground uppercase"
            >
              {label.slice(0, 3)}
            </div>
          ))}
        </div>

        {/* Data rows */}
        {yLabels.map((yLabel) => (
          <div key={yLabel} className="flex">
            <div className="w-20 h-10 flex items-center justify-end pr-2 text-[9px] font-mono font-bold text-muted-foreground uppercase">
              {yLabel.slice(0, 12)}
            </div>
            {xLabels.map((xLabel) => {
              const value = dataMap.get(`${xLabel}-${yLabel}`) ?? minValue;
              return (
                <div
                  key={`${xLabel}-${yLabel}`}
                  className={cn(
                    "w-10 h-10 flex items-center justify-center text-[10px] font-mono font-bold",
                    getColorClass(value, minValue, maxValue, colorScale)
                  )}
                  title={`${yLabel} vs ${xLabel}: ${value}`}
                >
                  {value}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
