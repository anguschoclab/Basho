import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from "@/contexts/GameContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClickableName } from "@/components/ClickableName";
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

  // No active basho — show placeholder
  if (!stats || !world.currentBasho) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tournament</span>
          </div>
        </div>
        <div className="text-center py-6">
          <Trophy className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
          <div className="text-sm text-muted-foreground">No active basho</div>
          <div className="text-xs text-muted-foreground/70 mt-1">Start a basho from the calendar</div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-primary/20 bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {world.currentBasho.bashoName?.toUpperCase()} — Day {stats.day}
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate("/basho")} className="h-6 text-xs gap-1 text-muted-foreground">
          View <ChevronRight className="h-3 w-3" />
        </Button>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Bouts", value: stats.bouts, icon: Swords, color: "text-muted-foreground" },
          { label: "Kinboshi", value: stats.kinboshi, icon: Star, color: stats.kinboshi > 0 ? "text-gold" : "text-muted-foreground" },
          { label: "Upsets", value: stats.upsets, icon: Swords, color: stats.upsets > 3 ? "text-accent" : "text-muted-foreground" },
          { label: "Injuries", value: stats.injuries, icon: HeartPulse, color: stats.injuries > 2 ? "text-destructive" : "text-muted-foreground" },
        ].map((s) => (
          <div key={s.label} className="text-center">
            <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
            <div className="text-[10px] text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Leaderboard */}
      <div className="space-y-0.5">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1">Leaderboard</div>
        {stats.top5.map((s, i) => {
          const r = world.rikishi.get(s.id);
          if (!r) return null;
          const isPlayer = r.heyaId === world.playerHeyaId;
          return (
            <div key={s.id} className={`flex items-center gap-2 text-xs py-1 px-2 rounded ${
              isPlayer ? "bg-primary/10" : i === 0 ? "bg-gold/5" : ""
            }`}>
              <span className="w-4 text-muted-foreground font-mono text-[10px]">{i + 1}</span>
              {i === 0 && <Crown className="h-3 w-3 text-gold" />}
              <ClickableName id={r.id} name={r.shikona} type="rikishi" className="flex-1 font-medium truncate" />
              <span className="font-mono text-muted-foreground">{s.wins}-{s.losses}</span>
              {isPlayer && <Badge className="text-[8px] h-3.5 bg-primary/20 text-primary px-1">YOU</Badge>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
