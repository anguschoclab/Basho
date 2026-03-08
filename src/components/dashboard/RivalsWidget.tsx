import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from "@/contexts/GameContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCachedPerception } from "@/engine/perception";
import { Swords, ChevronRight, Flame } from "lucide-react";

export function RivalsWidget() {
  const { state } = useGame();
  const navigate = useNavigate();
  const world = state.world;

  const rivals = useMemo(() => {
    if (!world) return [];
    const entries: { name: string; prestige: string; roster: string; morale: string; heat: string }[] = [];
    for (const heya of world.heyas.values()) {
      if (heya.id === world.playerHeyaId) continue;
      const p = getCachedPerception(world, heya.id);
      entries.push({
        name: p.heyaName,
        prestige: p.prestigeBand,
        roster: p.rosterStrengthBand,
        morale: p.moraleBand,
        heat: p.stableMediaHeatBand,
      });
    }
    const order = ["elite", "respected", "modest", "struggling", "unknown"];
    entries.sort((a, b) => order.indexOf(a.prestige) - order.indexOf(b.prestige));
    return entries.slice(0, 6);
  }, [world]);

  if (!world || !rivals.length) return null;

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Swords className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rival Stables</span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate("/rivalries")} className="h-6 text-xs gap-1 text-muted-foreground">
          All <ChevronRight className="h-3 w-3" />
        </Button>
      </div>

      <div className="space-y-0.5">
        {rivals.map((r) => (
          <div key={r.name} className="flex items-center gap-2 py-1.5 px-2 rounded text-xs hover:bg-muted/50 transition-colors">
            <span className="font-medium flex-1 truncate">{r.name}</span>
            <Badge variant="outline" className="text-[10px] capitalize shrink-0">{r.prestige}</Badge>
            <span className="text-[10px] text-muted-foreground capitalize w-16 text-right">{r.roster}</span>
            {(r.heat === "blazing" || r.heat === "hot") && (
              <Flame className="h-3 w-3 text-destructive/70 shrink-0" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
