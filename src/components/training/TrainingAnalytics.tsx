/**
 * TrainingAnalytics.tsx
 *
 * Training effectiveness visualization with charts.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { LayoutDashboard, Target, BrainCircuit } from "lucide-react";

const commonAxisProps = {
  tick: { fontSize: 10, fontWeight: 600, fontFamily: "JetBrains Mono" },
  axisLine: false,
  tickLine: false,
};

const commonTooltipProps = {
  contentStyle: {
    backgroundColor: "hsl(var(--card))",
    borderColor: "hsl(var(--border))",
    fontSize: "11px",
    fontFamily: "Spectral",
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
  },
  labelStyle: { fontWeight: 600, fontFamily: "JetBrains Mono" },
};

interface TrainingAnalyticsProps {
  trainingEffectivenessData: Array<{
    intensity: string;
    growth: number;
    fatigue: number;
    injuryRisk: number;
  }>;
  focusBiasData: Array<{
    focus: string;
    strength: number;
    speed: number;
    technique: number;
    balance: number;
  }>;
}

export function TrainingAnalytics({
  trainingEffectivenessData,
  focusBiasData,
}: TrainingAnalyticsProps) {
  return (
    <section className="space-y-6 pt-6 border-t-2 border-dashed">
      <div className="flex items-center gap-4 mb-4">
        <div className="p-3 bg-primary/10 rounded-lg">
          <BrainCircuit className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-3xl font-display font-black uppercase tracking-tight">
            Training Analytics
          </h2>
          <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground opacity-60">
            Comparative analysis of regimens and focus areas
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Intensity Effectiveness Chart */}
        <Card className="paper">
          <CardHeader>
            <CardTitle className="text-sm font-display font-black flex items-center gap-2 uppercase tracking-tight">
              <LayoutDashboard className="h-4 w-4 text-primary" />
              Intensity Multipliers
            </CardTitle>
            <CardDescription className="text-[10px] uppercase font-black tracking-widest opacity-50">
              Growth vs fatigue by intensity level
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={trainingEffectivenessData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="hsl(var(--border))"
                  />
                  <XAxis dataKey="intensity" {...commonAxisProps} />
                  <YAxis {...commonAxisProps} />
                  <Tooltip {...commonTooltipProps} />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Bar
                    dataKey="growth"
                    fill="hsl(var(--success))"
                    name="Growth"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="fatigue"
                    fill="hsl(var(--warning))"
                    name="Fatigue"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Focus Bias Chart */}
        <Card className="paper">
          <CardHeader>
            <CardTitle className="text-sm font-display font-black flex items-center gap-2 uppercase tracking-tight">
              <Target className="h-4 w-4 text-primary" />
              Focus Bias Matrix
            </CardTitle>
            <CardDescription className="text-[10px] uppercase font-black tracking-widest opacity-50">
              Stat emphasis by tactical focus
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={focusBiasData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="hsl(var(--border))"
                  />
                  <XAxis dataKey="focus" {...commonAxisProps} />
                  <YAxis {...commonAxisProps} />
                  <Tooltip {...commonTooltipProps} />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Bar
                    dataKey="strength"
                    fill="hsl(var(--primary))"
                    name="Strength"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar dataKey="speed" fill="hsl(var(--west))" name="Speed" radius={[4, 4, 0, 0]} />
                  <Bar
                    dataKey="technique"
                    fill="hsl(var(--accent))"
                    name="Technique"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="balance"
                    fill="hsl(var(--success))"
                    name="Balance"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
