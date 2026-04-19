/**
 * YearlyMetaReport.tsx
 * ====================
 * An annual world report detailing the era-wide shift in wrestling styles.
 * (Phase R: Era Drift Narrative)
 */

import { cn } from "@/lib/utils";
import { Globe, TrendingUp, Zap, Shield, Target, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from "recharts";

interface YearlyMetaReportProps {
  eraTone: "classic" | "explosive" | "technical" | "defensive";
  year: number;
  familyStats: Array<{ family: string; count: number; percentage: number }>;
}

export function YearlyMetaReport({ eraTone, year, familyStats }: YearlyMetaReportProps) {
  const chartData = familyStats.map((f) => ({
    subject: f.family.toUpperCase(),
    A: f.percentage,
    fullMark: 100,
  }));

  const toneColors: Record<string, string> = {
    classic: "border-primary bg-primary/5 text-primary",
    explosive: "border-warning bg-warning/5 text-warning",
    technical: "border-east bg-east/5 text-east",
    defensive: "border-success bg-success/5 text-success",
  };

  const descriptions: Record<string, string> = {
    classic: "Return of the 'Golden Belt'. Traditional strength and consistency carry the day.",
    explosive: "Oshi-sumo dominance. Raw power and rapid-fire strikes overwhelm the circuit.",
    technical: "A dance of tactics. Throws and leg-trips have seen a statistical resurgence.",
    defensive: "The era of the brick wall. Matches are longer; counters are more precise.",
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-1000">
      {/* ═══ ERA HEADLINE ═══ */}
      <div
        className={cn(
          "p-10 rounded-3xl border-2 relative overflow-hidden",
          toneColors[eraTone] || toneColors.classic
        )}
      >
        <div className="absolute -top-10 -right-10 opacity-10 rotate-12 pointer-events-none">
          <Globe className="h-64 w-64" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
          <div className="h-24 w-24 bg-background rounded-full flex items-center justify-center shadow-xl shrink-0">
            {getToneIcon(eraTone)}
          </div>

          <div className="space-y-4 flex-1 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-4">
              <Badge className="font-black tracking-widest uppercase px-4 h-6 text-[9px]">
                Annual Global Report ({year})
              </Badge>
              <span className="text-[10px] font-black uppercase tracking-widest opacity-40 italic">
                Meta-Simulation v2.4
              </span>
            </div>
            <h2 className="text-5xl font-display font-black tracking-tighter uppercase leading-none">
              The {eraTone} Era
            </h2>
            <p className="text-lg font-display italic font-medium max-w-2xl text-muted-foreground">
              "{descriptions[eraTone]}"
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* 📉 STATISTICAL RADAR */}
        <Card className="paper border-2">
          <CardHeader>
            <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
              <Activity className="h-4 w-4" /> Tactical Family Dominance
            </CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase tracking-tight">
              Prevalence of technique families over the past 12 months
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                <PolarGrid stroke="hsla(var(--primary), 0.1)" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fill: "currentColor", fontSize: 10, fontWeight: 800 }}
                />
                <Radar
                  name="Dominance"
                  dataKey="A"
                  stroke="hsla(var(--primary), 0.6)"
                  fill="hsla(var(--primary), 0.4)"
                  fillOpacity={0.6}
                />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 📜 POLICY IMPACTS */}
        <Card className="paper border-2 bg-muted/5">
          <CardHeader>
            <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Training Policy Impacts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {getDriftImpacts(eraTone).map((impact, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-4 bg-background rounded-xl border group hover:border-primary/40 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      "p-2 rounded-lg",
                      impact.positive ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                    )}
                  >
                    {impact.icon}
                  </div>
                  <div>
                    <div className="text-xs font-black uppercase">{impact.label}</div>
                    <div className="text-[10px] text-muted-foreground font-medium">
                      {impact.desc}
                    </div>
                  </div>
                </div>
                <Badge
                  variant={impact.positive ? "default" : "secondary"}
                  className="font-black text-[9px]"
                >
                  {impact.value}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function getToneIcon(tone: string) {
  switch (tone) {
    case "explosive":
      return <Zap className="h-10 w-10 text-warning" />;
    case "technical":
      return <Target className="h-10 w-10 text-east" />;
    case "defensive":
      return <Shield className="h-10 w-10 text-success" />;
    default:
      return <Globe className="h-10 w-10 text-primary" />;
  }
}

function getDriftImpacts(tone: string) {
  const impacts = [
    {
      label: "Strength Training",
      value: "+15%",
      desc: "Traditional squats & power drills",
      positive: true,
      icon: <Activity className="h-4 w-4" />,
    },
    {
      label: "Technical Drills",
      value: "+10%",
      desc: "Throw refinement and balance",
      positive: true,
      icon: <Target className="h-4 w-4" />,
    },
    {
      label: "Reaction Speed",
      value: "-5%",
      desc: "Initial tachiai bursts",
      positive: false,
      icon: <Zap className="h-4 w-4" />,
    },
  ];

  if (tone === "explosive") {
    impacts[0].value = "+25%";
    impacts[2].value = "+20%";
  }
  if (tone === "technical") {
    impacts[1].value = "+30%";
    impacts[0].value = "+5%";
  }

  return impacts;
}
