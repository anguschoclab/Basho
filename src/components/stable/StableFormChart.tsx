/**
 * StableFormChart.tsx
 *
 * Per-basho wins/losses for a stable's CURRENT roster, aggregated from
 * careerHistory snapshots by projectStableBashoForm. Tooltip shows
 * record, participant count, and kachi-koshi count per basho.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/EmptyState";
import { TrendingUp } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { StableBashoFormRow } from "@/presenters/projections/heyaProjections";

interface FormTooltipEntry {
  payload: StableBashoFormRow;
}

function FormTooltip({ active, payload }: { active?: boolean; payload?: FormTooltipEntry[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="font-semibold">{d.basho}</p>
      <p className="text-muted-foreground">
        {d.wins}–{d.losses} · {d.rikishi} rikishi · {d.kachiKoshi} kachi-koshi
      </p>
    </div>
  );
}

export function StableFormChart({ data }: { data: StableBashoFormRow[] }) {
  return (
    <Card className="border-none shadow-none bg-transparent">
      <CardHeader className="px-0 pt-0 pb-4">
        <CardTitle className="text-lg font-display flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Basho Form
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        {data.length < 2 ? (
          <EmptyState
            icon={TrendingUp}
            title="Insufficient Data"
            description={`Complete ${2 - data.length} more Basho to surface stable form.`}
            compact
          />
        ) : (
          <div className="space-y-2">
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="basho"
                    tick={{ fontSize: 10, fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<FormTooltip />} cursor={{ fill: "hsl(var(--muted) / 0.3)" }} />
                  <Legend verticalAlign="top" height={28} iconType="circle" />
                  <Bar
                    name="Wins"
                    dataKey="wins"
                    fill="hsl(var(--success))"
                    radius={[3, 3, 0, 0]}
                  />
                  <Bar
                    name="Losses"
                    dataKey="losses"
                    fill="hsl(var(--destructive))"
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-tight">
              Recorded results of current roster members, last 6 basho
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
