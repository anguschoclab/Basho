/**
 * FinancialTrendsChart.tsx
 *
 * Grouped bar + line chart showing income vs. burn rate over the last 12 weeks.
 */

import { useMemo } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatYen } from "@/utils/engineUtils";

export interface LedgerEntry {
  amount: number;
  description: string;
  category: string;
  date?: { year: number; month: number; week?: number };
}

export interface FinancialTrendsChartProps {
  ledger: LedgerEntry[];
  currentYear: number;
  currentWeek: number;
}

interface WeekBucket {
  label: string;
  income: number;
  burn: number;
  net: number;
  /** Absolute week index used for sorting */
  weekIndex: number;
}

/** Build the last 12 weekly buckets from absolute week numbers. */
function buildWeeklyBuckets(
  ledger: LedgerEntry[],
  currentYear: number,
  currentWeek: number
): WeekBucket[] {
  // Represent each year as weeks-per-year = 52 for index arithmetic.
  const WEEKS_PER_YEAR = 52;
  const currentAbsWeek = currentYear * WEEKS_PER_YEAR + currentWeek;

  const buckets: Record<number, WeekBucket> = {};

  // Initialize 12 buckets ending at currentWeek (inclusive).
  for (let i = 11; i >= 0; i--) {
    const absWeek = currentAbsWeek - i;
    const yr = Math.floor(absWeek / WEEKS_PER_YEAR);
    const wk = absWeek % WEEKS_PER_YEAR;
    buckets[absWeek] = {
      label: `W${wk === 0 ? WEEKS_PER_YEAR : wk}`,
      income: 0,
      burn: 0,
      net: 0,
      weekIndex: absWeek,
    };
  }

  // Assign ledger entries to buckets.
  for (const entry of ledger) {
    let absWeek: number;
    if (entry.date) {
      const wk = entry.date.week ?? 1;
      absWeek = entry.date.year * WEEKS_PER_YEAR + wk;
    } else {
      // Entries without a date fall into the current week.
      absWeek = currentAbsWeek;
    }

    if (!(absWeek in buckets)) continue;

    if (entry.amount >= 0) {
      buckets[absWeek].income += entry.amount;
    } else {
      buckets[absWeek].burn += Math.abs(entry.amount);
    }
  }

  // Compute net for each bucket.
  for (const b of Object.values(buckets)) {
    b.net = b.income - b.burn;
  }

  return Object.values(buckets).sort((a, b) => a.weekIndex - b.weekIndex);
}

interface CustomTooltipPayload {
  name: string;
  value: number;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: CustomTooltipPayload[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div
      style={{
        backgroundColor: "hsl(var(--card))",
        borderColor: "hsl(var(--border))",
        border: "1px solid",
        borderRadius: "12px",
        padding: "10px 14px",
        fontSize: "12px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
      }}
    >
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {formatYen(p.value)}
        </p>
      ))}
    </div>
  );
}

export function FinancialTrendsChart({
  ledger,
  currentYear,
  currentWeek,
}: FinancialTrendsChartProps) {
  const chartData = useMemo(
    () => buildWeeklyBuckets(ledger, currentYear, currentWeek),
    [ledger, currentYear, currentWeek]
  );

  // Count non-zero weeks to decide if we have enough history.
  const nonEmptyWeeks = chartData.filter((b) => b.income > 0 || b.burn > 0).length;
  const hasEnoughData = ledger.length >= 3 && nonEmptyWeeks >= 1;

  return (
    <Card className="paper">
      <CardHeader>
        <CardTitle>Financial Flow — Last 12 Weeks</CardTitle>
        <CardDescription>Income vs. expenditure by week</CardDescription>
      </CardHeader>
      <CardContent>
        {!hasEnoughData ? (
          <div className="flex items-center justify-center h-[220px] text-sm text-muted-foreground">
            Not enough financial history yet.
          </div>
        ) : (
          <div className="h-[300px] w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="hsl(var(--border))"
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => formatYen(v)}
                  width={80}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend verticalAlign="top" height={36} iconType="circle" />
                <Bar
                  dataKey="income"
                  name="Income"
                  fill="hsl(var(--success) / 0.7)"
                  radius={[3, 3, 0, 0]}
                />
                <Bar
                  dataKey="burn"
                  name="Burn"
                  fill="hsl(var(--destructive) / 0.6)"
                  radius={[3, 3, 0, 0]}
                />
                <Line
                  type="monotone"
                  dataKey="net"
                  name="Net"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "hsl(var(--primary))" }}
                  activeDot={{ r: 5 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
