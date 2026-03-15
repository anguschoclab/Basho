import { useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useGame } from "@/contexts/GameContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RikishiName } from "@/components/ClickableName";
import { Trophy, ChevronRight, Crown, Star, Swords, HeartPulse } from "lucide-react";

export function BashoWidget() {
  const { state } = useGame();
  const navigate = useNavigate();
  const world = state.world;

  const stats = useMemo(() => {
    if (!world?.currentBasho) return null;
    const basho = world.currentBasho;
    const matches = basho.matches || [];
    const completed = matches.filter((m: any) => m.result);

    let kinboshi = 0, upsets = 0, injuries = 0;
    for (const m of completed) {
      if ((m.result as any)?.isKinboshi) kinboshi++;
      if (m.result?.upset) upsets++;
    }
    for (const r of world.rikishi.values()) {
      if (r.injured) injuries++;
    }

    const standings = Array.from(basho.standings.entries())
      .map(([id, rec]) => ({ id, ...rec }))
      .sort((a, b) => b.wins - a.wins || a.losses - b.losses);

    return {
      day: basho.day,
      bouts: completed.length,
      kinboshi, upsets, injuries,
      top5: standings.slice(0, 5),
    };
  }, [world?.currentBasho?.day, world?.currentBasho?.matches?.length]);

  if (!world) return null;

  if (!stats || !world.currentBasho) {
    return (
      <div className="widget-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tournament</span>
        </div>
        <div className="text-center py-8">
          <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
            <Trophy className="h-6 w-6 text-muted-foreground/30" />
          </div>
          <div className="text-sm text-muted-foreground font-medium">No active basho</div>
          <div className="text-xs text-muted-foreground/60 mt-1">Advance time to begin the tournament</div>
        </div>
      </div>
    );
  }

  return (
    <div className="widget-card p-4 space-y-3 border-primary/20 relative overflow-hidden">
      {/* Subtle shimmer accent for active tournament */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-accent/50 to-transparent shimmer-bar" />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-accent" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {world.currentBasho.bashoName?.toUpperCase()} — Day {stats.day}
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate("/basho")} className="h-6 text-xs gap-1 text-muted-foreground">
          View <ChevronRight className="h-3 w-3" />
        </Button>
      </div>

      {/* Quick stats with visual emphasis */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Bouts", value: stats.bouts, icon: Swords, color: "text-foreground" },
          { label: "Kinboshi", value: stats.kinboshi, icon: Star, color: stats.kinboshi > 0 ? "text-gold" : "text-muted-foreground" },
          { label: "Upsets", value: stats.upsets, icon: Swords, color: stats.upsets > 3 ? "text-accent" : "text-muted-foreground" },
          { label: "Injuries", value: stats.injuries, icon: HeartPulse, color: stats.injuries > 2 ? "text-destructive" : "text-muted-foreground" },
        ].map((s) => (
          <div key={s.label} className="text-center p-1.5 rounded-md bg-muted/30">
            <div className={`text-lg font-bold font-display ${s.color}`}>{s.value}</div>
            <div className="text-[10px] text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Leaderboard */}
      <div className="space-y-0.5">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1 mb-1">Leaderboard</div>
        {stats.top5.map((s, i) => {
          const r = world.rikishi.get(s.id);
          if (!r) return null;
          const isPlayer = r.heyaId === world.playerHeyaId;
          return (
            <div key={s.id} className={`flex items-center gap-2 text-xs py-1.5 px-2 rounded-md transition-colors ${
              isPlayer ? "bg-primary/10 border border-primary/20" : i === 0 ? "bg-gold/5" : "hover:bg-muted/40"
            }`}>
              <span className={`w-5 font-display font-bold text-sm ${i === 0 ? "text-gold" : i === 1 ? "text-silver" : i === 2 ? "text-bronze" : "text-muted-foreground"}`}>
                {i + 1}
              </span>
              {i === 0 && <Crown className="h-3.5 w-3.5 text-gold" />}
              <RikishiName id={r.id} name={r.shikona}  className="flex-1 font-medium truncate" />
              <span className="font-mono text-muted-foreground tabular-nums">{s.wins}-{s.losses}</span>
              {isPlayer && <Badge className="text-[8px] h-3.5 bg-primary/20 text-primary px-1">YOU</Badge>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
