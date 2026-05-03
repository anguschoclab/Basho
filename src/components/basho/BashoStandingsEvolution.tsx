/**
 * BashoStandingsEvolution.tsx
 * ===========================
 * Line chart showing cumulative wins per day for top competitors
 * during an active basho tournament.
 */

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { BoutResult } from "@/engine/types/basho";

/** Color palette cycling through primary + 7 accent colors */
const LINE_COLORS = [
  "hsl(var(--primary))",
  "#60a5fa",
  "#34d399",
  "#f472b6",
  "#fb923c",
  "#a78bfa",
  "#facc15",
  "#94a3b8",
];

interface BashoStandingsEvolutionProps {
  basho: {
    day: number;
    results?: BoutResult[][];
    standings: Map<string, { wins: number; losses: number }>;
  };
  rikishiMap: Map<string, { id: string; shikona: string; rank: string; rankNumber?: number }>;
  maxLines?: number;
}

type ChartDataPoint = { day: number } & Record<string, number>;

export function BashoStandingsEvolution({
  basho,
  rikishiMap,
  maxLines = 8,
}: BashoStandingsEvolutionProps) {
  const { data, topIds } = useMemo(() => {
    // Guard: need at least day 2 with results
    if (!basho.results || basho.results.length === 0 || basho.day < 2) {
      return { data: [], topIds: [] };
    }

    // 1. Identify top maxLines rikishi by current standings wins (descending)
    const standingsEntries = Array.from(basho.standings.entries());
    const sorted = standingsEntries.sort((a, b) => b[1].wins - a[1].wins).slice(0, maxLines);
    const topIds = sorted.map(([id]) => id);

    // 2. Reconstruct day-by-day cumulative wins from results array
    //    results is per-day: results[dayIndex][boutIndex]
    //    dayIndex 0 = Day 1
    const cumulative: Record<string, number> = {};
    topIds.forEach((id) => (cumulative[id] = 0));

    const daysToShow = Math.min(basho.day, 15);
    const chartData: ChartDataPoint[] = [];

    for (let d = 0; d < daysToShow; d++) {
      const dayResults = basho.results[d] ?? [];
      // Count wins for each tracked rikishi on this day
      for (const bout of dayResults) {
        if (topIds.includes(bout.winnerRikishiId)) {
          cumulative[bout.winnerRikishiId] = (cumulative[bout.winnerRikishiId] ?? 0) + 1;
        }
      }

      // Snapshot cumulative wins at end of this day
      const point: ChartDataPoint = { day: d + 1 };
      for (const id of topIds) {
        const rikishi = rikishiMap.get(id);
        const label = rikishi?.shikona ?? id;
        point[label] = cumulative[id] ?? 0;
      }
      chartData.push(point);
    }

    return { data: chartData, topIds };
  }, [basho, rikishiMap, maxLines]);

  // Labels for the lines (shikona or fallback to id)
  const lineLabels = useMemo(
    () => topIds.map((id) => rikishiMap.get(id)?.shikona ?? id),
    [topIds, rikishiMap]
  );

  const isEmpty = data.length === 0;

  return (
    <Card className="paper">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Tournament Standings Evolution
        </CardTitle>
        <CardDescription className="text-xs">Cumulative wins by day</CardDescription>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Standings evolution available after Day 2.
          </p>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 16 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis
                  dataKey="day"
                  type="number"
                  domain={[1, 15]}
                  ticks={[1, 3, 5, 7, 9, 11, 13, 15]}
                  tick={{ fontSize: 11 }}
                  label={{ value: "Day", position: "insideBottom", offset: -8, fontSize: 11 }}
                />
                <YAxis
                  domain={[0, 15]}
                  ticks={[0, 3, 6, 9, 12, 15]}
                  tick={{ fontSize: 11 }}
                  label={{
                    value: "Wins",
                    angle: -90,
                    position: "insideLeft",
                    offset: 10,
                    fontSize: 11,
                  }}
                  width={36}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                    fontSize: "12px",
                  }}
                  labelFormatter={(label) => `Day ${label}`}
                />
                <Legend
                  wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                  iconType="circle"
                  iconSize={8}
                />
                {lineLabels.map((label, idx) => (
                  <Line
                    key={label}
                    type="monotone"
                    dataKey={label}
                    stroke={LINE_COLORS[idx % LINE_COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
