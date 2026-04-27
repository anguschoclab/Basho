/**
 * Sparkline.tsx
 * ============
 * Mini inline trend chart for dashboard widgets.
 */

import { useMemo } from "react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: "default" | "success" | "destructive" | "gold";
  className?: string;
}

const colorMap = {
  default: { stroke: "hsl(var(--primary))", fill: "hsl(var(--primary) / 0.2)" },
  success: { stroke: "hsl(var(--success))", fill: "hsl(var(--success) / 0.2)" },
  destructive: { stroke: "hsl(var(--destructive))", fill: "hsl(var(--destructive) / 0.2)" },
  gold: { stroke: "hsl(var(--gold))", fill: "hsl(var(--gold) / 0.2)" },
};

export function Sparkline({
  data,
  width = 80,
  height = 32,
  color = "default",
  className,
}: SparklineProps) {
  const chartData = useMemo(() => data.map((value, index) => ({ index, value })), [data]);

  const colors = colorMap[color];

  return (
    <div className={cn("inline-block", className)} style={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <Area
            type="monotone"
            dataKey="value"
            stroke={colors.stroke}
            fill={colors.fill}
            strokeWidth={1.5}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
