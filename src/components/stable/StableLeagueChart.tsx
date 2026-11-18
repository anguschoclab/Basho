/**
 * StableLeagueChart.tsx
 *
 * League table for the most recently completed basho — total recorded
 * wins per stable, aggregated from each rikishi's latest careerHistory
 * snapshot by projectStableLeague. The viewed stable's bar is highlighted;
 * tooltip shows record and participant count.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Trophy } from "lucide-react";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { StableLeagueResult, StableLeagueRow } from "@/presenters/projections/heyaProjections";

interface LeagueTooltipEntry {
  payload: StableLeagueRow;
}

function LeagueTooltip({ active, payload }: { active?: boolean; payload?: LeagueTooltipEntry[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="font-semibold">{d.heyaName}</p>
      <p className="text-muted-foreground">
        {d.wins}–{d.losses} · {d.rikishi} rikishi recorded
      </p>
    </div>
  );
}

export function StableLeagueChart({
  data,
  highlightHeyaId,
}: {
  data: StableLeagueResult | null;
  highlightHeyaId?: string;
}) {
  const rows = data?.rows ?? [];
  return (
    <Card className="border-none shadow-none bg-transparent">
      <CardHeader className="px-0 pt-0 pb-4">
        <CardTitle className="text-lg font-display flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          Stable League{data ? ` — ${data.bashoLabel}` : ""}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        {rows.length === 0 ? (
          <EmptyState
            icon={Trophy}
            title="No Completed Basho"
            description="Complete a Basho to surface the stable league table."
            compact
          />
        ) : (
          <div className="space-y-2">
            <div style={{ height: Math.max(160, rows.length * 26 + 40) }} className="w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={rows}
                  layout="vertical"
                  margin={{ top: 0, right: 24, bottom: 0, left: 8 }}
                >
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10, fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="heyaName"
                    width={120}
                    tick={{ fontSize: 10, fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    content={<LeagueTooltip />}
                    cursor={{ fill: "hsl(var(--muted) / 0.3)" }}
                  />
                  <Bar name="Wins" dataKey="wins" radius={[0, 3, 3, 0]} maxBarSize={18}>
                    {rows.map((row) => (
                      <Cell
                        key={row.heyaId}
                        fill={
                          row.heyaId === highlightHeyaId
                            ? "hsl(var(--primary))"
                            : "hsl(var(--muted-foreground) / 0.4)"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-tight">
              Total recorded wins per stable — {data?.bashoLabel} · current rosters
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
