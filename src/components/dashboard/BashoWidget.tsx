import React, { useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useGame } from "@/contexts/GameContext";
import { Badge } from "@/components/ui/badge";
import { RikishiName } from "@/components/ClickableName";
import { Trophy, Crown, Star, Swords, HeartPulse } from "lucide-react";
import { BaseWidget } from "./BaseWidget";
import { selectInjuredRikishi } from "@/presenters/selectors";

const LeaderboardRow = React.memo(
  ({
    s,
    i,
    isPlayer,
    rikishi,
  }: {
    s: { id: string; wins: number; losses: number };
    i: number;
    isPlayer: boolean;
    rikishi: import("@/engine/types/rikishi").Rikishi;
  }) => {
    return (
      <div
        className={`flex items-center gap-2 text-xs py-1.5 px-2 rounded-md transition-colors ${
          isPlayer
            ? "bg-primary/10 border border-primary/20"
            : i === 0
              ? "bg-gold/5"
              : "hover:bg-muted/40"
        }`}
      >
        <span
          className={`w-5 font-display font-bold text-sm ${i === 0 ? "text-gold" : i === 1 ? "text-silver" : i === 2 ? "text-bronze" : "text-muted-foreground"}`}
        >
          {i + 1}
        </span>
        {i === 0 && <Crown className="h-3.5 w-3.5 text-gold" />}
        <RikishiName
          id={rikishi.id}
          name={rikishi.shikona}
          className="flex-1 font-medium truncate"
        />
        <span className="font-mono text-muted-foreground tabular-nums">
          {s.wins}-{s.losses}
        </span>
        {isPlayer && (
          <Badge className="text-[8px] h-3.5 bg-primary/20 text-primary px-1">
            YOU
          </Badge>
        )}
      </div>
    );
  },
);

const QuickStat = React.memo(({ label, value, color }: { label: string; value: number; color: string }) => {
  return (
    <div className="text-center p-1.5 rounded-md bg-muted/30">
      <div className={`text-lg font-bold font-display ${color}`}>
        {value}
      </div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
});

export function BashoWidget() {
  const { state } = useGame();
  const navigate = useNavigate();
  const headerAction = useMemo(() => ({
    label: "View",
    onClick: () => navigate({ to: "/basho" as any }),
    tooltip: "Review current tournament standings and bracket details"
  }), [navigate]);
  const world = state.world;

  const stats = useMemo(() => {
    if (!world?.currentBasho) return null;
    const basho = world.currentBasho;
    const matches = basho.matches || [];

    // ⚡ Bolt Performance Optimization: Single-pass loops to avoid allocating intermediate arrays
    let completedCount = 0;
    let kinboshi = 0;
    let upsets = 0;
    let injuries = selectInjuredRikishi(world).length;

    for (const m of matches) {
      if (m.result) {
        completedCount++;
        if ((m.result as any)?.isKinboshi) kinboshi++;
        if (m.result?.upset) upsets++;
      }
    }

    const standingsArr = [];
    for (const [id, rec] of basho.standings.entries()) {
      standingsArr.push({ id, ...rec });
    }
    standingsArr.sort((a, b) => b.wins - a.wins || a.losses - b.losses);

    return {
      day: basho.day,
      bouts: completedCount,
      kinboshi,
      upsets,
      injuries,
      top5: standingsArr.slice(0, 5),
    };
  }, [world?.currentBasho?.day, world?.currentBasho?.matches?.length]);

  if (!world) return null;

  if (!stats || !world.currentBasho) {
    return (
      <BaseWidget title="Tournament" icon={Trophy}>
        <div className="text-center py-8">
          <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
            <Trophy className="h-6 w-6 text-muted-foreground/30" />
          </div>
          <div className="text-sm text-muted-foreground font-medium">
            No active basho
          </div>
          <div className="text-xs text-muted-foreground/60 mt-1">
            Advance time to begin the tournament
          </div>
        </div>
      </BaseWidget>
    );
  }

  return (
    <BaseWidget
      title={`${world.currentBasho.bashoName?.toUpperCase()} — Day ${stats.day}`}
      icon={Trophy}
      className="border-primary/20 relative overflow-hidden"
      headerAction={headerAction}
    >
      {/* Subtle shimmer accent for active tournament */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-accent/50 to-transparent shimmer-bar" />

      {/* Quick stats with visual emphasis */}
      <div className="grid grid-cols-4 gap-2">
        <QuickStat label="Bouts" value={stats.bouts} color="text-foreground" />
        <QuickStat label="Kinboshi" value={stats.kinboshi} color={stats.kinboshi > 0 ? "text-gold" : "text-muted-foreground"} />
        <QuickStat label="Upsets" value={stats.upsets} color={stats.upsets > 3 ? "text-accent" : "text-muted-foreground"} />
        <QuickStat label="Injuries" value={stats.injuries} color={stats.injuries > 2 ? "text-destructive" : "text-muted-foreground"} />
      </div>

      {/* Leaderboard */}
      <div className="space-y-0.5">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1 mb-1">
          Leaderboard
        </div>
        {stats.top5.map((s, i) => {
          const r = world.rikishi.get(s.id);
          if (!r) return null;
          const isPlayer = r.heyaId === world.playerHeyaId;
          return (
            <LeaderboardRow
              key={s.id}
              s={s}
              i={i}
              isPlayer={isPlayer}
              rikishi={r}
            />
          );
        })}
      </div>
    </BaseWidget>
  );
}
