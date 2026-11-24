/**
 * CareerEarningsCard.tsx
 *
 * Career earnings card for the rikishi career tab — headline economics
 * stats plus the cumulative earnings chart.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet } from "lucide-react";
import {
  ComposedChart,
  Bar,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export interface CareerEconomics {
  totalEarnings: number;
  cash: number;
  retirementFund: number;
  careerKenshoWon: number;
  kinboshiCount: number;
  popularity: number;
  currentBashoEarnings: number;
  careerEndorsements: number;
  careerPatronage: number;
}

const STREAMS = [
  { key: "jsa", label: "JSA Pay", color: "hsl(var(--primary) / 0.75)" },
  { key: "endorsements", label: "Endorsements", color: "hsl(var(--warning) / 0.8)" },
  { key: "patronage", label: "Tanimachi Gifts", color: "hsl(var(--success) / 0.8)" },
] as const;

export function CareerEarningsCard({
  earningsProgressionData,
  economics,
}: {
  earningsProgressionData?: Array<{
    basho: string;
    cumulativeEarnings: number;
    bashoEarnings: number;
  }>;
  economics?: CareerEconomics;
}) {
  if (!earningsProgressionData || earningsProgressionData.length < 2 || !economics) return null;
  return (
    <Card className="paper">
      <CardHeader>
        <CardTitle className="text-lg font-display font-black flex items-center gap-2 uppercase tracking-tight">
          <Wallet className="h-5 w-5 text-primary" />
          Career Earnings
        </CardTitle>
        <CardDescription className="text-xs uppercase font-black tracking-widest opacity-50">
          Cumulative career earnings trajectory
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <div className="space-y-1">
            <div className="text-[10px] uppercase font-black tracking-widest opacity-50">
              Total Earnings
            </div>
            <div className="text-lg font-display font-black tabular-nums">
              ¥{economics.totalEarnings.toLocaleString("ja-JP")}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-[10px] uppercase font-black tracking-widest opacity-50">Cash</div>
            <div className="text-lg font-display font-black tabular-nums">
              ¥{economics.cash.toLocaleString("ja-JP")}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-[10px] uppercase font-black tracking-widest opacity-50">
              Retirement Fund
            </div>
            <div className="text-lg font-display font-black tabular-nums">
              ¥{economics.retirementFund.toLocaleString("ja-JP")}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-[10px] uppercase font-black tracking-widest opacity-50">
              Kensho Won
            </div>
            <div className="text-lg font-display font-black tabular-nums">
              {economics.careerKenshoWon}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-[10px] uppercase font-black tracking-widest opacity-50">
              Kinboshi
            </div>
            <div className="text-lg font-display font-black tabular-nums">
              {economics.kinboshiCount}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-[10px] uppercase font-black tracking-widest opacity-50">
              Outside Income
            </div>
            <div className="text-lg font-display font-black tabular-nums">
              ¥{((economics.careerEndorsements ?? 0) + (economics.careerPatronage ?? 0)).toLocaleString("ja-JP")}
            </div>
          </div>
        </div>
        <IncomeMixBar economics={economics} />
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={earningsProgressionData}
              margin={{
                top: 10,
                right: 30,
                left: 0,
                bottom: earningsProgressionData.length > 6 ? 40 : 10,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis
                dataKey="basho"
                tick={{
                  fontSize: 9,
                  fontFamily: "inherit",
                  fill: "hsl(var(--muted-foreground))",
                }}
                tickLine={false}
                axisLine={false}
                angle={earningsProgressionData.length > 6 ? -35 : 0}
                textAnchor={earningsProgressionData.length > 6 ? "end" : "middle"}
                interval={0}
              />
              <YAxis
                tickFormatter={(v: number) => `¥${(v / 10000).toFixed(0)}万`}
                tick={{
                  fontSize: 9,
                  fontFamily: "inherit",
                  fill: "hsl(var(--muted-foreground))",
                }}
                tickLine={false}
                axisLine={false}
                width={48}
              />
              <Tooltip
                formatter={(value, name) => [
                  `¥${Number(value).toLocaleString("ja-JP")}`,
                  String(name),
                ]}
              />
              <Legend
                verticalAlign="top"
                height={28}
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 10, fontFamily: "inherit" }}
              />
              <Bar
                dataKey="bashoEarnings"
                name="Basho Earnings"
                fill="hsl(var(--success) / 0.45)"
                radius={[3, 3, 0, 0]}
              />
              <Area
                type="monotone"
                dataKey="cumulativeEarnings"
                name="Cumulative"
                stroke="hsl(var(--primary))"
                strokeWidth={2.5}
                fill="hsl(var(--primary) / 0.15)"
                dot={{ fill: "hsl(var(--primary))", r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6, strokeWidth: 2, stroke: "hsl(var(--background))" }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Career income composition — JSA pay vs the two outside streams.
 * JSA pay is derived (totalEarnings minus the tracked outside streams),
 * so the bar always reconciles to Total Earnings.
 */
function IncomeMixBar({ economics }: { economics: CareerEconomics }) {
  const endorsements = economics.careerEndorsements ?? 0;
  const patronage = economics.careerPatronage ?? 0;
  const outside = endorsements + patronage;
  const total = economics.totalEarnings;
  if (total <= 0) return null;
  const segments = [
    { ...STREAMS[0], value: Math.max(0, total - outside) },
    { ...STREAMS[1], value: endorsements },
    { ...STREAMS[2], value: patronage },
  ];
  const outsidePct = Math.round((outside / total) * 100);
  return (
    <div className="mb-6 space-y-2">
      <div className="flex items-baseline justify-between">
        <div className="text-[10px] uppercase font-black tracking-widest opacity-50">
          Income Mix
        </div>
        <div className="text-xs font-display font-black tabular-nums">
          {outsidePct}% outside JSA
        </div>
      </div>
      <div className="flex h-3 w-full overflow-hidden rounded-sm bg-muted/40">
        {segments.map(
          (s) =>
            s.value > 0 && (
              <div
                key={s.key}
                style={{ width: `${(s.value / total) * 100}%`, backgroundColor: s.color }}
                title={`${s.label}: ¥${Math.round(s.value).toLocaleString("ja-JP")}`}
              />
            )
        )}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {segments.map(
          (s) =>
            s.value > 0 && (
              <div key={s.key} className="flex items-center gap-1.5">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">
                  {s.label}
                </span>
                <span className="text-[10px] font-display font-black tabular-nums">
                  ¥{Math.round(s.value).toLocaleString("ja-JP")}
                </span>
              </div>
            )
        )}
      </div>
    </div>
  );
}
