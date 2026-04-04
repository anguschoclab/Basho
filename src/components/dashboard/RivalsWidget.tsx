import React, { useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useGame } from "@/contexts/GameContext";
import { Badge } from "@/components/ui/badge";
import { StableName } from "@/components/ClickableName";
import { Swords, Flame } from "lucide-react";
import { BaseWidget } from "./BaseWidget";
import { getCachedPerception } from "@/presenters/uiDigest";


const RivalRow = React.memo(({ r }: { r: { id: string; name: string; prestige: string; roster: string; heat: string } }) => {
  return (
    <div className="flex items-center gap-2 py-1.5 px-2 rounded-md text-xs hover:bg-muted/50 transition-colors">
      <StableName id={r.id} name={r.name} className="font-medium flex-1 truncate" />
      <Badge variant="outline" className="text-[10px] capitalize shrink-0">{r.prestige}</Badge>
      <span className="text-[10px] text-muted-foreground capitalize w-16 text-right">{r.roster}</span>
      {(r.heat === "blazing" || r.heat === "hot") && (
        <Flame className="h-3 w-3 text-accent shrink-0 animate-pulse-glow" />
      )}
    </div>
  );
});

/** rivals widget. */
export function RivalsWidget() {
  const { state } = useGame();
  const navigate = useNavigate();
  const world = state.world;

  const rivals = useMemo(() => {
    if (!world) return [];
    const entries: { id: string; name: string; prestige: string; roster: string; morale: string; heat: string }[] = [];
    for (const heya of world.heyas.values()) {
      if (heya.id === world.playerHeyaId) continue;
      const p = getCachedPerception(world, heya.id);
      entries.push({
        id: heya.id,
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
    <BaseWidget
      title="Rival Stables"
      icon={Swords}
      headerAction={{ 
        label: "All", 
        onClick: () => navigate({ to: "/rivalries" }),
        tooltip: "Analyze rival stables and their relative prestige"
      }}
    >
      <div className="space-y-0.5">
        {rivals.map((r) => (
          <RivalRow key={r.id} r={r} />
        ))}
      </div>
    </BaseWidget>
  );
}
