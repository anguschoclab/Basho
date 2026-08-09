import React, { useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useGame } from "@/contexts/useGame";
import { Badge } from "@/components/ui/badge";
import { RikishiName } from "@/components/ClickableName";
import { Trophy, Crown, Star, Swords, HeartPulse } from "lucide-react";
import { BaseWidget } from "./BaseWidget";
import { selectInjuredRikishi } from "@/presenters/selectors";
import { sortStandings } from "@/presenters/engineAccess";
import { EmptyState } from "@/components/ui/EmptyState";

const LeaderboardRow = React.memo(
  ({
    id,
    shikona,
    wins,
    losses,
    i,
    isPlayer,
  }: {
    id: string;
    shikona: string;
    wins: number;
    losses: number;
    i: number;
    isPlayer: boolean;
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
        <RikishiName id={id} name={shikona} className="flex-1 font-medium truncate" />
        <span className="font-mono text-muted-foreground tabular-nums">
          {wins}-{losses}
        </span>
        {isPlayer && (
          <Badge className="text-[8px] h-3.5 bg-primary/20 text-primary px-1">YOU</Badge>
        )}
      </div>
    );
  }
);

export function BashoWidget() {
  const { state } = useGame();
  const navigate = useNavigate();
  const headerAction = useMemo(
    () => ({
      label: "View",
      onClick: () => navigate({ to: "/basho" }),
      tooltip: "Review current tournament standings and bracket details",
    }),
    [navigate]
  );
  const world = state.world;

  const stats = useMemo(() => {
    if (!world?.currentBasho) return null;
    const basho = world.currentBasho;
    const matches = basho.matches || [];

    // ⚡ Bolt Performance Optimization: Single-pass loops to avoid allocating intermediate arrays
    let completedCount = 0;
    let kinboshi = 0;
    let upsets = 0;
    const injuries = selectInjuredRikishi(world).length;

    for (const m of matches) {
      if (m.result) {
        completedCount++;
        if ((m.result as { isKinboshi?: boolean })?.isKinboshi) kinboshi++;
        if (m.result?.upset) upsets++;
      }
    }

    const standingsArr = sortStandings(
      Array.from(basho.standings.entries()).map(([id, rec]) => ({ id, ...rec }))
    );

    return {
      day: basho.day,
      bouts: completedCount,
      kinboshi,
      upsets,
      injuries,
      top5: standingsArr.slice(0, 5),
    };
  }, [world]);

  if (!world) return null;

  if (!stats || !world.currentBasho) {
    return (
      <BaseWidget title="Tournament" icon={Trophy}>
        <EmptyState
          icon={Trophy}
          title="No active basho"
          description="Advance time to begin the tournament"
          compact
        />
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
        {[
          {
            label: "Bouts",
            value: stats.bouts,
            icon: Swords,
            color: "text-foreground",
          },
          {
            label: "Kinboshi",
            value: stats.kinboshi,
            icon: Star,
            color: stats.kinboshi > 0 ? "text-gold" : "text-muted-foreground",
          },
          {
            label: "Upsets",
            value: stats.upsets,
            icon: Swords,
            color: stats.upsets > 3 ? "text-accent" : "text-muted-foreground",
          },
          {
            label: "Injuries",
            value: stats.injuries,
            icon: HeartPulse,
            color: stats.injuries > 2 ? "text-destructive" : "text-muted-foreground",
          },
        ].map((s) => (
          <div key={s.label} className="text-center p-1.5 rounded-md bg-muted/30">
            <div className={`text-lg font-bold font-display ${s.color}`}>{s.value}</div>
            <div className="text-[10px] text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Leaderboard */}
      <div className="space-y-0.5">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1 mb-1">
          Leaderboard
        </div>
        {(() => {
          const limit = stats.top5.length;
          const nodes = new Array(limit);
          for (let i = 0; i < limit; i++) {
            const s = stats.top5[i];
            const r = world.rikishi.get(s.id);
            if (!r) continue;
            const isPlayer = r.heyaId === world.playerHeyaId;
            nodes[i] = (
              <LeaderboardRow
                key={s.id}
                id={r.id}
                shikona={r.shikona}
                wins={s.wins}
                losses={s.losses}
                i={i}
                isPlayer={isPlayer}
              />
            );
          }
          return nodes;
        })()}
      </div>
    </BaseWidget>
  );
}
