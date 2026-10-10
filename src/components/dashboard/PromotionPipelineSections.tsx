/**
 * PromotionPipelineSections.tsx
 *
 * Promotion pipeline widget sections — rank distribution chart, kadoban
 * alert rows, and the promotion-watch contender rows (yokozuna/ozeki).
 */

import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Trophy, ChevronUp } from "lucide-react";
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import {
  getKadobanDrama,
  type OzekiRunCandidate,
  type YokozunaCandidate,
} from "@/presenters/projections/promotionProjections";

function ProgressBar({ value, tone }: { value: number; tone: "success" | "warning" | "gold" }) {
  const colorMap = { success: "bg-success", warning: "bg-warning", gold: "bg-gold" };
  return (
    <div className="w-full h-1.5 bg-muted/40 rounded-full overflow-hidden">
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Promotion progress"
        className={`h-full rounded-full transition-all duration-500 ${colorMap[tone]}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

function MiniRankBadge({ rank }: { rank: string }) {
  const colorMap: Record<string, string> = {
    yokozuna: "text-gold border-gold/40 bg-gold/10",
    ozeki: "text-gold border-gold/40 bg-gold/10",
    sekiwake: "text-primary border-primary/40 bg-primary/10",
    komusubi: "text-primary border-primary/40 bg-primary/10",
  };
  return (
    <Badge
      variant="outline"
      className={`text-[10px] font-bold uppercase tracking-wide shrink-0 ${colorMap[rank] ?? "text-muted-foreground border-border"}`}
    >
      {rank}
    </Badge>
  );
}

function OzekiRow({ candidate }: { candidate: OzekiRunCandidate }) {
  const { rikishi, recentWins, threshold, progress } = candidate;
  const tone = progress >= 90 ? "gold" : progress >= 60 ? "success" : "warning";
  return (
    <div className="space-y-1 py-1.5">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold truncate flex-1">{rikishi.shikona}</span>
        <MiniRankBadge rank={rikishi.rank} />
        <span className="text-[10px] font-mono text-muted-foreground tabular-nums shrink-0">
          {recentWins}/{threshold}W
        </span>
      </div>
      <ProgressBar value={progress} tone={tone} />
    </div>
  );
}

function YokozunaRow({ candidate }: { candidate: YokozunaCandidate }) {
  const { rikishi, recentYushos, recentJunYushos, supportLevel } = candidate;
  const supportColor =
    supportLevel === "strong"
      ? "text-success"
      : supportLevel === "adequate"
        ? "text-gold"
        : "text-muted-foreground";
  const label =
    recentYushos >= 2
      ? "2 Yusho"
      : recentYushos === 1 && recentJunYushos >= 1
        ? "1Y+1J"
        : recentYushos === 1
          ? "1 Yusho"
          : `${recentJunYushos} Jun-Y`;
  return (
    <div className="flex items-center gap-2 py-1.5">
      <Trophy className="h-3 w-3 text-gold shrink-0" />
      <span className="text-xs font-semibold truncate flex-1">{rikishi.shikona}</span>
      <MiniRankBadge rank={rikishi.rank} />
      <span className={`text-[10px] font-mono tabular-nums shrink-0 ${supportColor}`}>{label}</span>
    </div>
  );
}

function KadobanRow({ entry }: { entry: ReturnType<typeof getKadobanDrama>[number] }) {
  const { rikishi, isDemoted } = entry as {
    rikishi: { id: string; shikona: string; rank: string };
    isDemoted: boolean;
  };
  return (
    <div className="flex items-center gap-2 py-1.5 px-2 rounded-md bg-destructive/5 border border-destructive/20">
      <AlertTriangle
        className={`h-3 w-3 shrink-0 ${isDemoted ? "text-destructive animate-pulse" : "text-warning"}`}
      />
      <span className="text-xs font-semibold truncate flex-1">{rikishi.shikona}</span>
      <MiniRankBadge rank={rikishi.rank} />
      {isDemoted ? (
        <span className="text-[10px] font-bold text-destructive uppercase tracking-wide shrink-0">
          Demoted
        </span>
      ) : (
        <span className="text-[10px] font-bold text-warning uppercase tracking-wide shrink-0">
          Kadoban
        </span>
      )}
    </div>
  );
}

export interface RankDistributionPoint {
  rank: string;
  count: number;
  color: string;
}

/** Rank distribution bar chart — active rikishi counts per tier. */
export function RankDistributionChart({ data }: { data: RankDistributionPoint[] }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest">
        Rank Distribution
      </p>
      <div className="h-40 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart layout="vertical" data={data} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="rank"
              width={62}
              tick={{
                fontSize: 9,
                fontFamily: "monospace",
                fill: "hsl(var(--muted-foreground))",
              }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: "hsl(var(--muted) / 0.3)" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const pt = payload[0].payload as { rank: string; count: number };
                return (
                  <div className="bg-background border border-border rounded px-2 py-1 text-[10px] font-bold shadow">
                    <span className="opacity-60">{pt.rank}</span> <span>{pt.count} rikishi</span>
                  </div>
                );
              }}
            />
            <Bar dataKey="count" radius={[0, 3, 3, 0]} maxBarSize={12}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="border-t border-border/40" />
    </div>
  );
}

/** Kadoban alert section — demotion-watch rows. */
export function KadobanSection({ entries }: { entries: ReturnType<typeof getKadobanDrama> }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-mono font-bold text-destructive uppercase tracking-widest">
        Kadoban Alert
      </p>
      <div className="space-y-1">
        {entries.map((entry, i) => (
          <KadobanRow key={i} entry={entry} />
        ))}
      </div>
    </div>
  );
}

/** Promotion watch — yokozuna and ozeki contender rows. */
export function PromotionWatch({
  yokozunaCandidates,
  ozekiRuns,
}: {
  yokozunaCandidates: YokozunaCandidate[];
  ozekiRuns: OzekiRunCandidate[];
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <ChevronUp className="h-3 w-3 text-success" />
        <p className="text-[10px] font-mono font-bold text-success uppercase tracking-widest">
          Promotion Watch
        </p>
      </div>
      {yokozunaCandidates.length > 0 && (
        <div className="space-y-0.5">
          <p className="text-[10px] font-bold text-gold uppercase tracking-wide">
            Yokozuna Contenders
          </p>
          {yokozunaCandidates.slice(0, 3).map((c) => (
            <YokozunaRow key={c.rikishi.id} candidate={c} />
          ))}
        </div>
      )}
      {ozekiRuns.length > 0 && (
        <div className="space-y-0.5">
          {yokozunaCandidates.length > 0 && (
            <p className="text-[10px] font-bold text-primary uppercase tracking-wide pt-1">
              Ozeki Contenders
            </p>
          )}
          {ozekiRuns.slice(0, 4).map((c) => (
            <OzekiRow key={c.rikishi.id} candidate={c} />
          ))}
        </div>
      )}
    </div>
  );
}
