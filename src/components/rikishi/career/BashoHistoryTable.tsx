/**
 * BashoHistoryTable.tsx
 *
 * Season-by-season career ledger table for the rikishi career tab —
 * rank, record, accolades, hoshitori, earnings, and physicality.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { History, Star, Trophy, Medal } from "lucide-react";
import { TooltipWrap } from "@/components/ui/tooltip-wrap";
import type { CareerSnapshot } from "@/engine/types/history";
import { NarrativeService } from "@/presenters/engineAccess";
import { SeededRNG } from "@/presenters/engineAccess";
import { HoshitoriChart } from "@/components/game/HoshitoriChart";

function HistoryRow({ snap }: { snap: CareerSnapshot }) {
  return (
    <tr className="hover:bg-primary/5 transition-colors group">
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
      <td className="py-4 px-6">
        {snap.dayResults && snap.dayResults.length > 0 ? (
          <div className="flex justify-center">
            <HoshitoriChart
              rikishiId=""
              dayResults={snap.dayResults}
              className="[&>div]:h-4 [&>div]:w-4 [&>div]:text-[8px] [&>div]:gap-0"
            />
          </div>
        ) : (
          <span className="block text-center text-muted-foreground text-[10px] font-black opacity-30 tracking-widest">
            —
          </span>
        )}
      </td>
      <td className="py-4 px-6 text-right tabular-nums">
        <div className="text-xs font-black">
          {snap.totalEarningsAtBasho !== undefined
            ? `¥${snap.totalEarningsAtBasho.toLocaleString("ja-JP")}`
            : "—"}
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
  );
}

export function BashoHistoryTable({ history }: { history: CareerSnapshot[] }) {
  return (
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
                <th className="pb-4 px-6 text-center">Hoshitori</th>
                <th className="pb-4 px-6 text-right">Cumulative ¥</th>
                <th className="pb-4 pl-6 text-right">Physicality</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {(history || [])
                .slice()
                .reverse()
                .map((snap, i: number) => (
                  <HistoryRow key={i} snap={snap} />
                ))}
              {(!history || history.length === 0) && (
                <tr>
                  <td colSpan={6} className="py-20 text-center space-y-4 opacity-50">
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
  );
}
