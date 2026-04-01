import { useGame } from "@/contexts/GameContext";
import { Globe, TrendingUp, Info } from "lucide-react";
import { BaseWidget } from "./BaseWidget";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from "recharts";
import { useNavigate } from "@tanstack/react-router";
import { formatMetaTrends } from "@/presenters/uiDigest";

export function TrendsWidget() {
  const { state } = useGame();
  const navigate = useNavigate();
  const world = state.world;
  if (!world) return null;

  const data = formatMetaTrends(world);
  if (data.length === 0) {
    return (
      <BaseWidget title="JSA Meta Trends" icon={Globe}>
        <div className="h-40 flex flex-col items-center justify-center text-muted-foreground gap-2">
          <Info className="h-5 w-5 opacity-20" />
          <p className="text-[10px] uppercase font-bold tracking-widest">Insufficient Data</p>
          <p className="text-[9px] max-w-[150px] text-center opacity-70">Complete {6 - data.length} more Basho to surface macro trends.</p>
        </div>
      </BaseWidget>
    );
  }

  return (
    <BaseWidget 
      title="JSA Meta Trends" 
      icon={Globe}
      headerAction={{ 
        label: "History", 
        onClick: () => navigate({ to: "/jsa/trends" as any }),
        tooltip: "View historical meta shifts and tactical evolution in the JSA"
      }}
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-primary/10 border border-primary/20">
            <TrendingUp className="h-3 w-3 text-primary" />
            <span className="text-[10px] font-bold text-primary uppercase">Meta Bias: Oshi-Strong</span>
          </div>
          <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-70">Last 6 Basho</span>
        </div>

        <div className="h-40 w-full mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis 
                dataKey="basho" 
                hide 
              />
              <YAxis hide domain={[0, 100]} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "hsl(var(--card))", 
                  borderColor: "hsl(var(--border))",
                  fontSize: "10px",
                  borderRadius: "8px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
                }}
                itemStyle={{ padding: "0px" }}
              />
              <Area 
                type="monotone" 
                dataKey="oshi" 
                stackId="1" 
                stroke="hsl(var(--primary))" 
                fill="hsl(var(--primary))" 
                fillOpacity={0.6}
              />
              <Area 
                type="monotone" 
                dataKey="yotsu" 
                stackId="1" 
                stroke="hsl(var(--accent))" 
                fill="hsl(var(--accent))" 
                fillOpacity={0.4}
              />
              <Area 
                type="monotone" 
                dataKey="hybrid" 
                stackId="1" 
                stroke="hsl(var(--muted))" 
                fill="hsl(var(--muted))" 
                fillOpacity={0.2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-center justify-center gap-4 text-[9px] font-bold uppercase tracking-tighter text-muted-foreground border-t border-border/30 pt-2">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-primary" /> Oshi-Zumo
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-accent" /> Yotsu-Zumo
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-muted-foreground/30" /> Hybrid
          </div>
        </div>
      </div>
    </BaseWidget>
  );
}
