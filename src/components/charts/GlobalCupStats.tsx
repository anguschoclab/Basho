/**
 * GlobalCupStats.tsx
 * ==================
 * Data visualization components for Global Cup tournament statistics.
 */

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { WidgetCard } from "@/components/ui/WidgetCard";
import { WidgetHeader } from "@/components/ui/WidgetHeader";
import { BarChart3, PieChart as PieIcon } from "lucide-react";
import type { GlobalCupProjection } from "@/engine/types/globalCup";

interface GlobalCupStatsProps {
  projection: GlobalCupProjection | null;
}

const COLORS = [
  "hsl(var(--gold))",
  "hsl(var(--west))",
  "hsl(var(--success))",
  "hsl(var(--destructive))",
  "hsl(var(--accent))",
  "hsl(var(--east))",
];

export function ParticipantNationalityChart({ projection }: GlobalCupStatsProps) {
  const data = useMemo(() => {
    if (!projection?.participants) return [];

    const counts: Record<string, number> = {};
    projection.participants.forEach((p) => {
      counts[p.nationality] = (counts[p.nationality] || 0) + 1;
    });

    return Object.keys(counts).map((name) => ({ name, value: counts[name] }));
  }, [projection]);

  if (data.length === 0) return null;

  return (
    <WidgetCard>
      <WidgetHeader title="Participant Nationalities" icon={PieIcon} />
      <div className="h-48 mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={70}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "6px",
              }}
              labelStyle={{ color: "hsl(var(--muted-foreground))" }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </WidgetCard>
  );
}

export function BracketProgressChart({ projection }: GlobalCupStatsProps) {
  const data = useMemo(() => {
    if (!projection?.bracket) return [];

    const rounds: Record<string, { total: number; complete: number }> = {};

    projection.bracket.forEach((match) => {
      if (!rounds[match.round]) {
        rounds[match.round] = { total: 0, complete: 0 };
      }
      rounds[match.round].total++;
      if (match.isComplete) {
        rounds[match.round].complete++;
      }
    });

    return Object.keys(rounds).map((round) => {
      const stats = rounds[round];
      return {
        round: round.charAt(0).toUpperCase() + round.slice(1),
        total: stats.total,
        complete: stats.complete,
        pending: stats.total - stats.complete,
      };
    });
  }, [projection]);

  if (data.length === 0) return null;

  return (
    <WidgetCard>
      <WidgetHeader title="Bracket Progress" icon={BarChart3} />
      <div className="h-48 mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="round" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
            <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "6px",
              }}
              labelStyle={{ color: "hsl(var(--muted-foreground))" }}
            />
            <Bar dataKey="complete" stackId="a" fill="hsl(var(--success))" />
            <Bar dataKey="pending" stackId="a" fill="hsl(var(--muted-foreground))" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </WidgetCard>
  );
}

export function GlobalCupDashboardStats({ projection }: GlobalCupStatsProps) {
  if (!projection) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <ParticipantNationalityChart projection={projection} />
      <BracketProgressChart projection={projection} />
    </div>
  );
}
