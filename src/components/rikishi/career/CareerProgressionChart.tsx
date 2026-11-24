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
  ReferenceLine,
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
  const caEntry = payload.find((p) => p.dataKey === "ca");
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
      {caEntry?.value !== undefined && (
        <div>
          Ability: <span className="font-bold">{Math.round(caEntry.value)}/200</span>
        </div>
      )}
      {snap && (
        <div className="opacity-60 text-[10px] pt-1">
          {(snap as { payload?: { wins?: number; losses?: number } }).payload?.wins ?? 0}W –{" "}
          {(snap as { payload?: { wins?: number; losses?: number } }).payload?.losses ?? 0}L
        </div>
      )}
    </div>
  );
}

interface ProgressionRow {
  basho: string;
  rankValue: number;
  wins: number;
  losses: number;
  winRate: number;
  /** CA (0–200) at that basho — absent on pre-snapshot history. */
  ca?: number;
}

/** Axes, grid, series and the PA-ceiling marker for the composed chart. */
function ProgressionChartBody({ data, paCeiling }: { data: ProgressionRow[]; paCeiling?: number }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart
        data={data}
        margin={{ top: 10, right: 30, left: 0, bottom: data.length > 6 ? 40 : 10 }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
        <XAxis
          dataKey="basho"
          tick={{ fontSize: 9, fontFamily: "inherit", fill: "hsl(var(--muted-foreground))" }}
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
          tick={{ fontSize: 9, fontFamily: "inherit", fill: "hsl(var(--muted-foreground))" }}
          tickLine={false}
          axisLine={false}
          width={28}
        />
        <YAxis yAxisId="ca" hide domain={[0, 200]} />
        <YAxis
          yAxisId="winRate"
          orientation="right"
          domain={[0, 1]}
          tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
          tick={{ fontSize: 9, fontFamily: "inherit", fill: "hsl(var(--muted-foreground))" }}
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
        {/* CA trajectory (0–200) vs the perceived PA ceiling marker —
            whether the wrestler is closing on his potential. */}
        <Line
          yAxisId="ca"
          type="monotone"
          dataKey="ca"
          name="Ability"
          stroke="hsl(var(--chart-2, var(--secondary)))"
          strokeWidth={2}
          strokeDasharray="6 3"
          connectNulls={false}
          dot={{ r: 2.5, strokeWidth: 0 }}
        />
        {paCeiling !== undefined && (
          <ReferenceLine
            yAxisId="ca"
            y={paCeiling}
            stroke="hsl(var(--muted-foreground))"
            strokeDasharray="4 4"
            label={{
              value: "Potential",
              position: "insideTopRight",
              fontSize: 9,
              fill: "hsl(var(--muted-foreground))",
            }}
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function CareerProgressionChart({
  data,
  paCeiling,
}: {
  data: ProgressionRow[];
  /** The observer's perceived PA ceiling (0–200) — drawn as a marker line. */
  paCeiling?: number;
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
            <ProgressionChartBody data={data} paCeiling={paCeiling} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
