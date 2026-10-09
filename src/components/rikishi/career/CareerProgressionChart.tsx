/**
 * CareerProgressionChart.tsx
 *
 * Career progression chart card for the rikishi career tab —
 * rank trajectory + win rate over time.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const RANK_LABELS: Record<number, string> = {
  1: "Yokozuna",
  2: "Ozeki",
  3: "Sekiwake",
  4: "Komusubi",
};
function rankLabel(value: number): string {
  if (value <= 4) return RANK_LABELS[value] ?? `#${value}`;
  if (value <= 20) return `Maegashira ${value - 4}`;
  if (value <= 36) return `Juryo ${value - 20}`;
  return `Makushita ${value - 36}`;
}

function CareerTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; dataKey: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const rankEntry = payload.find((p) => p.dataKey === "rankValue");
  const rateEntry = payload.find((p) => p.dataKey === "winRate");
  const snap = payload[0];
  return (
    <div className="bg-background border border-border rounded-lg p-3 shadow-lg text-xs space-y-1 font-display">
      <div className="font-black uppercase tracking-widest text-[10px] opacity-60">{label}</div>
      {rankEntry && (
        <div>
          Rank: <span className="font-bold">{rankLabel(rankEntry.value)}</span>
        </div>
      )}
      {rateEntry && (
        <div>
          Win Rate: <span className="font-bold">{Math.round(rateEntry.value * 100)}%</span>
        </div>
      )}
      {snap && (
        <div className="opacity-60 text-[9px] pt-1">
          {(snap as { payload?: { wins?: number; losses?: number } }).payload?.wins ?? 0}W –{" "}
          {(snap as { payload?: { wins?: number; losses?: number } }).payload?.losses ?? 0}L
        </div>
      )}
    </div>
  );
}

export function CareerProgressionChart({
  data,
}: {
  data: Array<{
    basho: string;
    rankValue: number;
    wins: number;
    losses: number;
    winRate: number;
  }>;
}) {
  if (data.length === 0) return null;
  return (
    <Card className="paper">
      <CardHeader>
        <CardTitle className="text-lg font-display font-black flex items-center gap-2 uppercase tracking-tight">
          <TrendingUp className="h-5 w-5 text-primary" />
          Career Progression
        </CardTitle>
        <CardDescription className="text-xs uppercase font-black tracking-widest opacity-50">
          Rank trajectory and win rate over time
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          {data.length < 2 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm font-display italic opacity-60">
              Not enough data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={data}
                margin={{
                  top: 10,
                  right: 30,
                  left: 0,
                  bottom: data.length > 6 ? 40 : 10,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="hsl(var(--border))"
                />
                <XAxis
                  dataKey="basho"
                  tick={{
                    fontSize: 9,
                    fontFamily: "inherit",
                    fill: "hsl(var(--muted-foreground))",
                  }}
                  tickLine={false}
                  axisLine={false}
                  angle={data.length > 6 ? -35 : 0}
                  textAnchor={data.length > 6 ? "end" : "middle"}
                  interval={0}
                />
                <YAxis
                  yAxisId="rank"
                  orientation="left"
                  reversed={true}
                  tickFormatter={(v: number) => `#${v}`}
                  tick={{
                    fontSize: 9,
                    fontFamily: "inherit",
                    fill: "hsl(var(--muted-foreground))",
                  }}
                  tickLine={false}
                  axisLine={false}
                  width={28}
                />
                <YAxis
                  yAxisId="winRate"
                  orientation="right"
                  domain={[0, 1]}
                  tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
                  tick={{
                    fontSize: 9,
                    fontFamily: "inherit",
                    fill: "hsl(var(--muted-foreground))",
                  }}
                  tickLine={false}
                  axisLine={false}
                  width={32}
                />
                <Tooltip content={<CareerTooltip />} />
                <Legend
                  verticalAlign="top"
                  height={28}
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 10, fontFamily: "inherit" }}
                />
                <Bar
                  yAxisId="winRate"
                  dataKey="winRate"
                  name="Win Rate"
                  fill="hsl(var(--success) / 0.45)"
                  radius={[3, 3, 0, 0]}
                />
                <Line
                  yAxisId="rank"
                  type="monotone"
                  dataKey="rankValue"
                  name="Rank"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2.5}
                  dot={{ fill: "hsl(var(--primary))", r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 6, strokeWidth: 2, stroke: "hsl(var(--background))" }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
