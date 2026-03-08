import { useMemo } from "react";
import { useGame } from "@/contexts/GameContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Star, Swords, HeartPulse, TrendingUp, Crown } from "lucide-react";
import { ClickableName } from "@/components/ClickableName";

export function BashoSummaryBanner() {
  const { state } = useGame();
  const world = state.world;

  const stats = useMemo(() => {
    if (!world?.currentBasho) return null;
    const basho = world.currentBasho;
    const matches = basho.matches || [];
    const completedMatches = matches.filter((m: any) => m.result);

    let kinboshiCount = 0;
    let upsetCount = 0;
    let injuryCount = 0;
    const kinboshiList: { winnerId: string; loserId: string; day: number; kimarite: string }[] = [];

    for (const m of completedMatches) {
      const r = m.result!;
      if ((r as any).isKinboshi) {
        kinboshiCount++;
        kinboshiList.push({
          winnerId: r.winnerRikishiId,
          loserId: r.loserRikishiId,
          day: m.day,
          kimarite: r.kimariteName || r.kimarite,
        });
      }
      if (r.upset) upsetCount++;
    }

    // Count current injuries
    for (const r of world.rikishi.values()) {
      if (r.injured) injuryCount++;
    }

    // Top standings
    const standings = Array.from(basho.standings.entries())
      .map(([id, rec]) => ({ id, ...rec }))
      .sort((a, b) => b.wins - a.wins || a.losses - b.losses);

    const leader = standings[0];
    const tiedForLead = standings.filter((s) => s.wins === leader?.wins).length;

    return {
      day: basho.day,
      totalBouts: completedMatches.length,
      kinboshiCount,
      kinboshiList,
      upsetCount,
      injuryCount,
      leader,
      tiedForLead,
      standings: standings.slice(0, 5),
    };
  }, [world?.currentBasho?.day, world?.currentBasho?.matches?.length]);

  if (!stats || !world?.currentBasho) return null;

  const playerHeyaId = world.playerHeyaId;

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="h-5 w-5 text-primary" />
          <h3 className="font-display font-bold text-sm">
            {world.currentBasho.bashoName?.toUpperCase()} BASHO — Day {stats.day}
          </h3>
          <Badge variant="outline" className="ml-auto text-xs">
            {stats.totalBouts} bouts played
          </Badge>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          <StatCard
            icon={Star}
            label="Kinboshi"
            value={stats.kinboshiCount}
            color="text-gold"
            highlight={stats.kinboshiCount > 0}
          />
          <StatCard
            icon={Swords}
            label="Upsets"
            value={stats.upsetCount}
            color="text-accent"
            highlight={stats.upsetCount > 3}
          />
          <StatCard
            icon={HeartPulse}
            label="Injuries"
            value={stats.injuryCount}
            color="text-destructive"
            highlight={stats.injuryCount > 2}
          />
          <StatCard
            icon={TrendingUp}
            label="Leader"
            value={`${stats.leader?.wins ?? 0}-${stats.leader?.losses ?? 0}`}
            color="text-primary"
            highlight={false}
            subtitle={stats.tiedForLead > 1 ? `${stats.tiedForLead}-way tie` : undefined}
          />
        </div>

        {/* Top 5 standings */}
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Leaderboard
          </p>
          {stats.standings.map((s, i) => {
            const r = world.rikishi.get(s.id);
            if (!r) return null;
            const isPlayer = r.heyaId === playerHeyaId;
            return (
              <div
                key={s.id}
                className={`flex items-center gap-2 text-xs py-1 px-2 rounded ${
                  isPlayer ? "bg-primary/10" : i === 0 ? "bg-gold/10" : ""
                }`}
              >
                <span className="w-4 text-muted-foreground font-mono text-[10px]">{i + 1}</span>
                {i === 0 && <Crown className="h-3 w-3 text-gold" />}
                <ClickableName id={r.id} name={r.shikona} type="rikishi" className="font-medium" />
                <span className="text-muted-foreground ml-auto font-mono">
                  {s.wins}-{s.losses}
                </span>
                {isPlayer && (
                  <Badge className="text-[8px] h-3.5 bg-primary/20 text-primary px-1">YOU</Badge>
                )}
              </div>
            );
          })}
        </div>

        {/* Kinboshi highlights */}
        {stats.kinboshiList.length > 0 && (
          <div className="mt-3 pt-2 border-t border-border">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              金星 Kinboshi
            </p>
            {stats.kinboshiList.map((k, i) => {
              const winner = world.rikishi.get(k.winnerId);
              const loser = world.rikishi.get(k.loserId);
              return (
                <div key={i} className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{winner?.shikona}</span>
                  {" defeated "}
                  <span className="font-medium text-foreground">{loser?.shikona}</span>
                  {" · Day "}{k.day}{" via "}{k.kimarite}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  highlight,
  subtitle,
}: {
  icon: any;
  label: string;
  value: string | number;
  color: string;
  highlight: boolean;
  subtitle?: string;
}) {
  return (
    <div
      className={`p-2 rounded-md border text-center ${
        highlight ? "border-accent/30 bg-accent/5" : "border-border bg-card"
      }`}
    >
      <Icon className={`h-4 w-4 mx-auto mb-1 ${color}`} />
      <div className="text-lg font-bold leading-tight">{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
      {subtitle && <div className="text-[9px] text-accent font-medium">{subtitle}</div>}
    </div>
  );
}
