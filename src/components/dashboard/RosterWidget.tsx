import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from "@/contexts/GameContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, ChevronRight, HeartPulse, AlertTriangle, Star } from "lucide-react";
import { ClickableName } from "@/components/ClickableName";
import { toPotentialBand } from "@/engine/descriptorBands";

export function RosterWidget() {
  const { state } = useGame();
  const navigate = useNavigate();
  const world = state.world;

  const roster = useMemo(() => {
    if (!world?.playerHeyaId) return [];
    const heya = world.heyas.get(world.playerHeyaId);
    if (!heya) return [];
    return heya.rikishiIds
      .map(id => world.rikishi.get(id))
      .filter(Boolean)
      .filter(r => !r!.isRetired)
      .sort((a, b) => (b!.power || 0) - (a!.power || 0)) as any[];
  }, [world]);

  if (!world) return null;

  const injuredCount = roster.filter(r => r.injured).length;
  const avgFatigue = roster.length ? Math.round(roster.reduce((s: number, r: any) => s + (r.fatigue || 0), 0) / roster.length) : 0;

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">My Roster</span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate("/rikishi")} className="h-6 text-xs gap-1 text-muted-foreground">
          All Rikishi <ChevronRight className="h-3 w-3" />
        </Button>
      </div>

      {/* Summary row */}
      <div className="flex gap-3 text-xs">
        <div className="flex items-center gap-1">
          <Users className="h-3 w-3 text-muted-foreground" />
          <span className="font-medium">{roster.length}</span>
          <span className="text-muted-foreground">active</span>
        </div>
        {injuredCount > 0 && (
          <div className="flex items-center gap-1 text-destructive">
            <HeartPulse className="h-3 w-3" />
            <span className="font-medium">{injuredCount}</span>
            <span>injured</span>
          </div>
        )}
        <div className="flex items-center gap-1 text-muted-foreground">
          <AlertTriangle className="h-3 w-3" />
          <span>Fatigue: {avgFatigue}%</span>
        </div>
      </div>

      {/* Roster list */}
      <div className="space-y-0.5">
        {roster.slice(0, 8).map((r: any) => {
          const potential = toPotentialBand(r.talentSeed ?? 50);
          return (
            <div key={r.id} className="flex items-center gap-2 py-1 px-2 rounded text-xs hover:bg-muted/50 transition-colors">
              <ClickableName id={r.id} name={r.shikona || r.name} type="rikishi" className="flex-1 font-medium truncate" />
              <span className="text-[10px] text-muted-foreground capitalize w-14 text-right">{r.rank}</span>
              {r.injured && <HeartPulse className="h-3 w-3 text-destructive shrink-0" />}
              {(potential === "Star Potential" || potential === "Generational Talent") && (
                <Star className="h-3 w-3 text-gold shrink-0" />
              )}
              {/* Fatigue bar */}
              <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden shrink-0">
                <div
                  className={`h-full rounded-full transition-all ${
                    (r.fatigue || 0) > 70 ? "bg-destructive" : (r.fatigue || 0) > 40 ? "bg-warning" : "bg-primary"
                  }`}
                  style={{ width: `${r.fatigue || 0}%` }}
                />
              </div>
            </div>
          );
        })}
        {roster.length > 8 && (
          <div className="text-[11px] text-muted-foreground text-center py-1">
            +{roster.length - 8} more wrestlers
          </div>
        )}
      </div>
    </div>
  );
}
