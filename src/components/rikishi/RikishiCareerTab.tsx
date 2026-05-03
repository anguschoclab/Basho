/**
 * RikishiCareerTab.tsx
 *
 * Career history tab content for rikishi profile page.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { History, Star, Trophy, Medal, TrendingUp } from "lucide-react";
import { TooltipWrap } from "@/components/ui/tooltip-wrap";
import type { CareerSnapshot, Milestone } from "@/engine/types/history";
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { NarrativeService } from "@/engine/systems/narrative/NarrativeService";
import { SeededRNG } from "@/engine/rng";

const RANK_LABELS: Record<number, string> = {
  1: "Yokozuna",
  2: "Ozeki",
  3: "Sekiwake",
  4: "Komusubi",
};
function rankLabel(value: number): string {
  if (value <= 4) return RANK_LABELS[value] ?? `#${value}`;
  if (value <= 20) return `Maegashira ${value - 4}`;
  if (value <= 36) return `Juryo ${value - 20}`;
  return `Makushita ${value - 36}`;
}

function CareerTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; dataKey: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const rankEntry = payload.find((p) => p.dataKey === "rankValue");
  const rateEntry = payload.find((p) => p.dataKey === "winRate");
  const snap = payload[0];
  return (
    <div className="bg-background border border-border rounded-lg p-3 shadow-lg text-xs space-y-1 font-display">
      <div className="font-black uppercase tracking-widest text-[10px] opacity-60">{label}</div>
      {rankEntry && (
        <div>
          Rank: <span className="font-bold">{rankLabel(rankEntry.value)}</span>
        </div>
      )}
      {rateEntry && (
        <div>
          Win Rate: <span className="font-bold">{Math.round(rateEntry.value * 100)}%</span>
        </div>
      )}
      {snap && (
        <div className="opacity-60 text-[9px] pt-1">
          {(snap as { payload?: { wins?: number; losses?: number } }).payload?.wins ?? 0}W –{" "}
          {(snap as { payload?: { wins?: number; losses?: number } }).payload?.losses ?? 0}L
        </div>
      )}
    </div>
  );
}

interface RikishiCareerTabProps {
  history: CareerSnapshot[];
  milestones: Milestone[];
  careerProgressionData: Array<{
    basho: string;
    rankValue: number;
    wins: number;
    losses: number;
    winRate: number;
  }>;
}

export function RikishiCareerTab({
  history,
  milestones,
  careerProgressionData,
}: RikishiCareerTabProps) {
  return (
    <div className="space-y-8">
      {/* Career Progression Chart */}
      {careerProgressionData.length > 0 && (
        <Card className="paper">
          <CardHeader>
            <CardTitle className="text-lg font-display font-black flex items-center gap-2 uppercase tracking-tight">
              <TrendingUp className="h-5 w-5 text-primary" />
              Career Progression
            </CardTitle>
            <CardDescription className="text-xs uppercase font-black tracking-widest opacity-50">
              Rank trajectory and win rate over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              {careerProgressionData.length < 2 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm font-display italic opacity-60">
                  Not enough data yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={careerProgressionData}
                    margin={{
                      top: 10,
                      right: 30,
                      left: 0,
                      bottom: careerProgressionData.length > 6 ? 40 : 10,
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
                      angle={careerProgressionData.length > 6 ? -35 : 0}
                      textAnchor={careerProgressionData.length > 6 ? "end" : "middle"}
                      interval={0}
                    />
                    <YAxis
                      yAxisId="rank"
                      orientation="left"
                      reversed={true}
                      tickFormatter={(v: number) => `#${v}`}
                      tick={{
                        fontSize: 9,
                        fontFamily: "inherit",
                        fill: "hsl(var(--muted-foreground))",
                      }}
                      tickLine={false}
                      axisLine={false}
                      width={28}
                    />
                    <YAxis
                      yAxisId="winRate"
                      orientation="right"
                      domain={[0, 1]}
                      tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
                      tick={{
                        fontSize: 9,
                        fontFamily: "inherit",
                        fill: "hsl(var(--muted-foreground))",
                      }}
                      tickLine={false}
                      axisLine={false}
                      width={32}
                    />
                    <Tooltip content={<CareerTooltip />} />
                    <Legend
                      verticalAlign="top"
                      height={28}
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: 10, fontFamily: "inherit" }}
                    />
                    <Bar
                      yAxisId="winRate"
                      dataKey="winRate"
                      name="Win Rate"
                      fill="hsl(var(--success) / 0.45)"
                      radius={[3, 3, 0, 0]}
                    />
                    <Line
                      yAxisId="rank"
                      type="monotone"
                      dataKey="rankValue"
                      name="Rank"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2.5}
                      dot={{ fill: "hsl(var(--primary))", r: 4, strokeWidth: 0 }}
                      activeDot={{ r: 6, strokeWidth: 2, stroke: "hsl(var(--background))" }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="paper border-0 shadow-none bg-transparent overflow-hidden">
        <CardHeader className="px-0 pb-6 border-b border-dashed border-border mb-6">
          <CardTitle className="text-2xl font-display font-black flex items-center gap-3 uppercase tracking-tight">
            <History className="h-6 w-6 text-primary" />
            Basho History Archives
          </CardTitle>
          <CardDescription className="text-xs uppercase font-black tracking-widest opacity-50">
            Historical ledger of all professional bouts and ranks.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60">
                  <th className="pb-4 pr-6">Official Basho</th>
                  <th className="pb-4 px-6 text-center">Association Rank</th>
                  <th className="pb-4 px-6 text-center">Final Record</th>
                  <th className="pb-4 px-6 text-center">Accolades</th>
                  <th className="pb-4 pl-6 text-right">Physicality</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {(history || [])
                  .slice()
                  .reverse()
                  .map((snap, i: number) => (
                    <tr key={i} className="hover:bg-primary/5 transition-colors group">
                      <td className="py-4 pr-6 font-display font-black text-sm uppercase tracking-tighter">
                        {snap.bashoName} {snap.year}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <Badge
                          variant="outline"
                          className="text-[9px] font-black uppercase tracking-widest px-2 h-5 border-2 group-hover:border-primary/30 transition-colors"
                        >
                          {snap.rank} {snap.rankNumber > 0 ? snap.rankNumber : ""}
                        </Badge>
                      </td>
                      <td className="py-4 px-6 text-center tabular-nums">
                        <div className="flex flex-col items-center">
                          <div
                            className={cn(
                              snap.wins >= snap.losses ? "text-success" : "text-gold",
                              "text-lg font-display font-black"
                            )}
                          >
                            {snap.wins}-{snap.losses}
                          </div>
                          <div className="text-[8px] uppercase font-black opacity-40">
                            {snap.wins >= 8 ? "Kachi-Koshi" : "Make-Koshi"}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-center gap-2">
                          {snap.isYusho && (
                            <TooltipWrap content="Basho Yusho: Tournament Champion">
                              <Trophy className="h-5 w-5 text-gold animate-pulse cursor-help" />
                            </TooltipWrap>
                          )}
                          {snap.isJunYusho && (
                            <TooltipWrap content="Jun-Yusho: Runner-up">
                              <Star className="h-4 w-4 text-gold cursor-help" />
                            </TooltipWrap>
                          )}
                          {snap.specialPrizes.shukunsho && (
                            <TooltipWrap content="Shukun-sho: Outstanding Performance Prize">
                              <Medal className="h-4 w-4 text-primary cursor-help" />
                            </TooltipWrap>
                          )}
                          {snap.specialPrizes.kantosho && (
                            <TooltipWrap content="Kanto-sho: Fighting Spirit Prize">
                              <Medal className="h-4 w-4 text-success cursor-help" />
                            </TooltipWrap>
                          )}
                          {snap.specialPrizes.ginosho && (
                            <TooltipWrap content="Gino-sho: Technique Prize">
                              <Medal className="h-4 w-4 text-west cursor-help" />
                            </TooltipWrap>
                          )}
                          {!snap.isYusho &&
                            !snap.isJunYusho &&
                            !Object.values(snap.specialPrizes).some((v) => v) && (
                              <span className="text-muted-foreground text-[10px] font-black opacity-30 tracking-widest">
                                NONE
                              </span>
                            )}
                        </div>
                      </td>
                      <td className="py-4 pl-6 text-right tabular-nums">
                        <div className="text-xs font-black opacity-60">
                          Weight: <span className="text-foreground">{snap.weight}kg</span>
                        </div>
                        {(() => {
                          const rng = new SeededRNG(`career-${snap.year}-${snap.bashoName}`);
                          const weightBand = NarrativeService.getWeightBand(snap.weight);
                          const weightLabel = NarrativeService.getWeightLabel(rng, weightBand);
                          return weightLabel ? (
                            <div className="text-[9px] text-muted-foreground/60">{weightLabel}</div>
                          ) : null;
                        })()}
                      </td>
                    </tr>
                  ))}
                {(!history || history.length === 0) && (
                  <tr>
                    <td colSpan={5} className="py-20 text-center space-y-4 opacity-50">
                      <div className="text-5xl text-muted-foreground animate-pulse font-display">
                        ∅
                      </div>
                      <p className="text-sm font-display italic">
                        No historical snapshots found in the career ledger.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Milestone Timeline */}
      <div className="space-y-6 pt-10 border-t-2 border-dashed">
        <h3 className="text-2xl font-display font-black flex items-center gap-3 uppercase tracking-tight">
          <Star className="h-6 w-6 text-gold" />
          Association Milestones
        </h3>
        <div className="relative pl-10 space-y-12 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-1 before:bg-muted before:rounded-full">
          {milestones.length === 0 ? (
            <div className="py-10 text-center bg-muted/20 border-2 border-dashed rounded-lg opacity-50">
              <p className="text-sm font-display italic">
                This rikishi has not yet participated in Association milestones.
              </p>
            </div>
          ) : (
            milestones
              .slice()
              .reverse()
              .map((m, i: number) => (
                <div
                  key={i}
                  className="relative animate-in slide-in-from-left-2 duration-500 fill-mode-both"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div className="absolute -left-[35px] top-1.5 h-4 w-4 rounded-full bg-primary border-4 border-background shadow-lg ring-4 ring-primary/10" />
                  <div className="space-y-2 max-w-2xl">
                    <div className="flex items-center gap-4">
                      <h4 className="font-display font-black text-xl uppercase tracking-tighter">
                        {m.title}
                      </h4>
                      <Badge
                        variant="outline"
                        className="text-[10px] font-black uppercase tracking-widest border-2"
                      >
                        {m.date.year}.{m.date.month}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed font-display italic opacity-80">
                      {m.description}
                    </p>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
}
