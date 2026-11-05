/**
 * KimariteDistributionChart.tsx
 *
 * Wins-by-technique distribution for a single rikishi, shaped by
 * useKimariteDistributionData from the recorded MatchResultLog window
 * (rolling 500 bouts). Answers "what does this rikishi actually win
 * with — one weapon or a balanced arsenal?"
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Swords } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

export interface KimariteRow {
  name: string;
  wins: number;
  percentage: number;
}

interface KimariteTooltipEntry {
  payload: KimariteRow;
}

function KimariteTooltip({ active, payload }: { active?: boolean; payload?: KimariteTooltipEntry[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="font-semibold">{d.name}</p>
      <p className="text-muted-foreground">
        {d.wins} wins · {d.percentage}% of recorded wins
      </p>
    </div>
  );
}

const MIN_WINS = 5;

export function KimariteDistributionChart({
  rows,
  totalWins,
}: {
  rows: KimariteRow[];
  totalWins: number;
}) {
  return (
    <Card className="border-none shadow-none bg-transparent">
      <CardHeader className="px-0 pt-0 pb-4">
        <CardTitle className="text-xl font-display font-black flex items-center gap-2 uppercase tracking-tight">
          <Swords className="h-5 w-5 text-primary" />
          Wins by Technique
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        {totalWins < MIN_WINS ? (
          <EmptyState
            icon={Swords}
            title="Insufficient Data"
            description={`Record ${MIN_WINS - totalWins} more wins to surface technique profile.`}
            compact
          />
        ) : (
          <div className="space-y-2">
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={rows}
                  layout="vertical"
                  margin={{ top: 0, right: 12, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10, fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={96}
                    tick={{ fontSize: 10, fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    content={<KimariteTooltip />}
                    cursor={{ fill: "hsl(var(--muted) / 0.3)" }}
                  />
                  <Bar dataKey="wins" fill="hsl(var(--primary))" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-tight">
              Winning techniques across {totalWins} recorded wins
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
