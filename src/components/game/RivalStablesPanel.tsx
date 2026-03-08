// RivalStablesPanel.tsx — Dashboard panel showing NPC stable activity via banded perception
// All data is derived from PerceptionSnapshot (A7.1) — no raw stats exposed.

import { useGame } from "@/contexts/GameContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buildPerceptionSnapshot, type PerceptionSnapshot } from "@/engine/perception";
import { Swords, Search, Shield, Flame, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useMemo } from "react";

const INTENSITY_DISPLAY: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  conservative: { label: "Light", variant: "secondary" },
  balanced: { label: "Balanced", variant: "outline" },
  intensive: { label: "Intense", variant: "default" },
  punishing: { label: "Punishing", variant: "destructive" },
};

const SCOUTING_DISPLAY: Record<string, { label: string; icon: typeof Search }> = {
  none: { label: "Inactive", icon: Search },
  passive: { label: "Passive", icon: Search },
  active: { label: "Active", icon: Search },
  aggressive: { label: "Aggressive", icon: Search },
};

const MORALE_COLOR: Record<string, string> = {
  inspired: "text-primary",
  content: "text-primary/70",
  neutral: "text-muted-foreground",
  disgruntled: "text-orange-500",
  mutinous: "text-destructive",
};

interface RivalEntry {
  perception: PerceptionSnapshot;
  trainingIntensity: string;
  scoutingPriority: string;
}

export function RivalStablesPanel() {
  const { state } = useGame();
  const world = state.world;

  const rivals = useMemo(() => {
    if (!world) return [];

    const entries: RivalEntry[] = [];
    for (const heya of world.heyas.values()) {
      if (heya.id === world.playerHeyaId) continue;

      const perception = buildPerceptionSnapshot(world, heya.id);

      // Infer NPC training intensity from perception bands (mirrors npcAI logic)
      let trainingIntensity = "balanced";
      if (perception.welfareRiskBand === "critical") trainingIntensity = "conservative";
      else if (perception.moraleBand === "mutinous" || perception.moraleBand === "disgruntled") trainingIntensity = "balanced";
      else if (perception.rosterStrengthBand === "dominant" || perception.rosterStrengthBand === "strong") trainingIntensity = "intensive";

      let scoutingPriority = "passive";
      if (perception.runwayBand === "desperate" || perception.runwayBand === "critical") scoutingPriority = "none";
      else if (perception.rosterSize < 8 || perception.rosterStrengthBand === "weak") scoutingPriority = "aggressive";
      else if (perception.rosterStrengthBand === "dominant") scoutingPriority = "passive";
      else scoutingPriority = "active";

      entries.push({ perception, trainingIntensity, scoutingPriority });
    }

    // Sort by prestige band (best first)
    const PRESTIGE_ORDER = ["elite", "respected", "modest", "struggling", "unknown"];
    entries.sort((a, b) =>
      PRESTIGE_ORDER.indexOf(a.perception.prestigeBand) - PRESTIGE_ORDER.indexOf(b.perception.prestigeBand)
    );

    return entries.slice(0, 8); // Show top 8 rivals
  }, [world]);

  if (!world || rivals.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Swords className="h-4 w-4 text-primary" />
          Rival Stables
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {rivals.map(({ perception: p, trainingIntensity, scoutingPriority }) => {
          const intensityInfo = INTENSITY_DISPLAY[trainingIntensity] ?? INTENSITY_DISPLAY.balanced;
          const moraleColor = MORALE_COLOR[p.moraleBand] ?? "text-muted-foreground";

          return (
            <div
              key={p.heyaId}
              className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
            >
              {/* Name + prestige */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">{p.heyaName}</span>
                  <Badge variant="outline" className="text-[10px] shrink-0 capitalize">
                    {p.prestigeBand}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span>{p.rosterSize} wrestlers</span>
                  <span className="capitalize">{p.rosterStrengthBand}</span>
                  <span className={moraleColor}>
                    {p.moraleBand === "inspired" || p.moraleBand === "content"
                      ? "☀ " : p.moraleBand === "disgruntled" || p.moraleBand === "mutinous"
                      ? "⚡ " : ""}
                    {p.moraleBand}
                  </span>
                </div>
              </div>

              {/* Training intensity */}
              <div className="flex flex-col items-center gap-0.5 shrink-0">
                <Badge variant={intensityInfo.variant} className="text-[10px]">
                  <Shield className="h-3 w-3 mr-1" />
                  {intensityInfo.label}
                </Badge>
                <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Training</span>
              </div>

              {/* Scouting activity */}
              <div className="flex flex-col items-center gap-0.5 shrink-0">
                <Badge
                  variant={scoutingPriority === "aggressive" ? "destructive" : scoutingPriority === "active" ? "default" : "secondary"}
                  className="text-[10px]"
                >
                  <Search className="h-3 w-3 mr-1" />
                  {SCOUTING_DISPLAY[scoutingPriority]?.label ?? "Passive"}
                </Badge>
                <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Scouting</span>
              </div>

              {/* Welfare/heat indicators */}
              <div className="flex items-center gap-1 shrink-0">
                {p.welfareRiskBand === "critical" && (
                  <Badge variant="destructive" className="text-[10px] px-1.5">⚠</Badge>
                )}
                {p.welfareRiskBand === "elevated" && (
                  <Badge variant="outline" className="text-[10px] px-1.5 border-destructive/50 text-destructive">!</Badge>
                )}
                {(p.stableMediaHeatBand === "blazing" || p.stableMediaHeatBand === "hot") && (
                  <Flame className="h-3.5 w-3.5 text-destructive/70" />
                )}
                {p.rivalryPressureBand === "fierce" && (
                  <Swords className="h-3.5 w-3.5 text-destructive" />
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
