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
}

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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="space-y-1">
            <div className="text-[10px] uppercase font-black tracking-widest opacity-50">
              Total Earnings
            </div>
            <div className="text-lg font-display font-black tabular-nums">
              ¥{economics.totalEarnings.toLocaleString("ja-JP")}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-[10px] uppercase font-black tracking-widest opacity-50">
              Cash
            </div>
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
        </div>
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
