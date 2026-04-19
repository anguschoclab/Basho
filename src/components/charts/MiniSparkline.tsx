/**
 * MiniSparkline.tsx
 * =================
 * Ultra-compact inline sparkline for widget headers and tables.
 */

import { LineChart, Line, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

interface MiniSparklineProps {
  data: number[];
  trend?: "up" | "down" | "neutral";
  width?: number;
  height?: number;
  className?: string;
}

const trendColors = {
  up: { stroke: "hsl(var(--success))", fill: "hsl(var(--success) / 0.1)" },
  down: { stroke: "hsl(var(--destructive))", fill: "hsl(var(--destructive) / 0.1)" },
  neutral: { stroke: "hsl(var(--muted-foreground))", fill: "transparent" },
};

export function MiniSparkline({
  data,
  trend = "neutral",
  width = 60,
  height = 24,
  className,
}: MiniSparklineProps) {
  const chartData = data.map((value, index) => ({ index, value }));
  const colors = trendColors[trend];

  return (
    <div className={cn("inline-flex", className)} style={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={colors.stroke}
            strokeWidth={1.5}
            dot={false}
            fill={colors.fill}
            fillOpacity={0}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
