import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer 
} from "recharts";
import { formatRadarData } from "@/presenters/uiDigest";
import type { Rikishi } from '../../engine/types/rikishi';

interface RikishiRadarChartProps {
  rikishi: Rikishi;
  className?: string;
}

export function RikishiRadarChart({ rikishi, className }: RikishiRadarChartProps) {
  const data = formatRadarData(rikishi);

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
          <PolarGrid />
          <PolarAngleAxis 
            dataKey="subject" 
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10, fontWeight: 700 }}
          />
          <PolarRadiusAxis 
            angle={30} 
            domain={[0, 5]} 
            tick={false} 
            axisLine={false} 
          />
          <Radar
            name="Rikishi"
            dataKey="A"
            stroke="hsl(var(--primary))"
            fill="hsl(var(--primary))"
            fillOpacity={0.4}
            animationBegin={300}
            animationDuration={800}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
