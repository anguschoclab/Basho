import { useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { ASSOCIATION_TABS } from "@/constants/ui/navigation";
import { PageHeader } from "@/components/layout/control-center";
import { useGame } from "@/contexts/useGame";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { formatMetaTrends } from "@/presenters/uiDigest";
import { TrendingUp, Info, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { EraTone } from "@/presenters/eraTone";
import { ERA_TONE_DESCRIPTIONS } from "@/presenters/eraTone";

const TONE_LABELS: Record<EraTone, string> = {
  classic: "CLASSIC (Yotsu)",
  explosive: "EXPLOSIVE (Oshi)",
  technical: "TECHNICAL (Hybrid)",
  defensive: "DEFENSIVE (Counter)",
};

export default function TrendsPage() {
  const { state } = useGame();
  const world = state.world;

  const data = useMemo(() => {
    if (!world) return [];
    return formatMetaTrends(world);
  }, [world]);

  if (!world) return null;

  const currentTone: EraTone = (world.meta?.tone as EraTone) ?? "classic";
  const toneLabel = TONE_LABELS[currentTone] ?? "CLASSIC";
  const toneDescription = ERA_TONE_DESCRIPTIONS[currentTone] ?? "";

  return (
    <AppLayout subNavTabs={ASSOCIATION_TABS} activeSubTab="trends" pageTitle="JSA Trends">
      <div className="space-y-6">
        <PageHeader
          eyebrow="── ASSOCIATION ──"
          title="JSA Meta Trends"
          lede="Historical analysis of technical biases and institutional drifts."
        />

        {/* Major Meta Streamgraph */}
        <Card className="paper">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Technical Dominance (Last 6 Basho)
                </CardTitle>
                <CardDescription>
                  Shift in winning styles across the top division over time.
                </CardDescription>
              </div>
              <Badge variant="outline" className="border-primary/30 text-primary" data-testid="era-tone-badge">
                ERA: {toneLabel}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
                    domain={[0, 100]}
                    unit="%"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      fontSize: "12px",
                      borderRadius: "12px",
                      boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
                    }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Area
                    type="monotone"
                    name="Oshi-Zumo (Thrusting)"
                    dataKey="oshi"
                    stackId="1"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.6}
                  />
                  <Area
                    type="monotone"
                    name="Yotsu-Zumo (Grappling)"
                    dataKey="yotsu"
                    stackId="1"
                    stroke="hsl(var(--accent))"
                    fill="hsl(var(--accent))"
                    fillOpacity={0.4}
                  />
                  <Area
                    type="monotone"
                    name="Hybrid/Varied Styles"
                    dataKey="hybrid"
                    stackId="1"
                    stroke="hsl(var(--muted-foreground))"
                    fill="hsl(var(--muted-foreground))"
                    fillOpacity={0.2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="paper bg-primary/5 border-primary/10">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Info className="h-4 w-4 text-primary" />
                Current Era: {toneLabel}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground leading-relaxed" data-testid="era-tone-description">
                {toneDescription}
              </p>
            </CardContent>
          </Card>

          <Card className="paper bg-warning/5 border-warning/10">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-warning" />
                Adapting to Shifts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Macro trends are determined by the collective success of Yokozuna and Ozeki. If the
                top ranks are dominated by grappling specialists, the Meta will shift towards Yotsu
                within 2-3 years.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
