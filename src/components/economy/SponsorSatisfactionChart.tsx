// SponsorSatisfactionChart.tsx — Horizontal bar chart of sponsor satisfaction scores
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export interface SponsorSatisfactionChartProps {
  sponsors: Array<{
    id: string;
    name: string;
    satisfaction: number; // 0–100
    tier: string;
    active: boolean;
  }>;
}

function getSatisfactionColor(score: number): string {
  if (score >= 70) return "hsl(var(--success))";
  if (score >= 40) return "hsl(var(--warning))";
  return "hsl(var(--destructive))";
}

interface TooltipPayloadEntry {
  payload: {
    name: string;
    tier: string;
    satisfaction: number;
  };
}

function SatisfactionTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="font-semibold">{d.name}</p>
      <p className="text-muted-foreground">Tier: {d.tier}</p>
      <p>
        Satisfaction:{" "}
        <span style={{ color: getSatisfactionColor(d.satisfaction) }} className="font-semibold">
          {d.satisfaction}
        </span>
      </p>
    </div>
  );
}

/** Horizontal bar chart showing satisfaction for each active sponsor. */
export function SponsorSatisfactionChart({ sponsors }: SponsorSatisfactionChartProps) {
  if (sponsors.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sponsor Satisfaction</CardTitle>
          <CardDescription>Current sentiment per active sponsor</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No active sponsors yet.</p>
        </CardContent>
      </Card>
    );
  }

  const barHeight = 32;
  const minChartHeight = 120;
  const chartHeight = Math.max(minChartHeight, sponsors.length * barHeight + 40);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sponsor Satisfaction</CardTitle>
        <CardDescription>Current sentiment per active sponsor</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart
            data={sponsors}
            layout="vertical"
            margin={{ top: 4, right: 24, bottom: 4, left: 8 }}
          >
            <XAxis
              type="number"
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={140}
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<SatisfactionTooltip />} cursor={{ fill: "hsl(var(--muted))" }} />
            <ReferenceLine
              x={50}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="4 3"
              label={{
                value: "Satisfied",
                position: "insideTopRight",
                fontSize: 10,
                fill: "hsl(var(--muted-foreground))",
              }}
            />
            <Bar dataKey="satisfaction" radius={[0, 3, 3, 0]} maxBarSize={22}>
              {sponsors.map((s) => (
                <Cell key={s.id} fill={getSatisfactionColor(s.satisfaction)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
