// PerceptionOverview.tsx — Rival stables perception panel for ScoutingPage
// Uses buildPerceptionSnapshot from perception.ts for banded intel

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StableName } from "@/components/ClickableName";
import { Building2, Eye, Shield, Heart, TrendingUp, Flame, Users, GitCompareArrows, X } from "lucide-react";
import type { WorldState } from "@/engine/types";
import { buildPerceptionSnapshot, type PerceptionSnapshot } from "@/engine/perception";

const STATURE_COLOR: Record<string, string> = {
  legendary: "text-amber-400",
  powerful: "text-purple-400",
  established: "text-blue-400",
  rebuilding: "text-orange-400",
  fragile: "text-destructive",
  new: "text-emerald-400",
};

const ROSTER_COLOR: Record<string, string> = {
  dominant: "text-amber-400",
  strong: "text-emerald-400",
  competitive: "text-primary",
  developing: "text-yellow-400",
  weak: "text-muted-foreground",
};

const MORALE_COLOR: Record<string, string> = {
  inspired: "text-emerald-400",
  content: "text-green-400",
  neutral: "text-muted-foreground",
  disgruntled: "text-orange-400",
  mutinous: "text-destructive",
};

const WELFARE_COLOR: Record<string, string> = {
  safe: "text-emerald-400",
  cautious: "text-yellow-400",
  elevated: "text-orange-400",
  critical: "text-destructive",
};

interface PerceptionOverviewProps {
  world: WorldState;
  playerHeyaId: string | null;
}

export function PerceptionOverview({ world, playerHeyaId }: PerceptionOverviewProps) {
  const navigate = useNavigate();

  const snapshots = useMemo(() => {
    const results: Array<PerceptionSnapshot & { isPlayer: boolean }> = [];
    for (const heya of world.heyas.values()) {
      if (heya.rikishiIds.length === 0) continue;
      const snap = buildPerceptionSnapshot(world, heya.id);
      results.push({ ...snap, isPlayer: heya.id === playerHeyaId });
    }
    // Sort: player first, then by roster strength
    const strengthOrder = ["dominant", "strong", "competitive", "developing", "weak"];
    results.sort((a, b) => {
      if (a.isPlayer !== b.isPlayer) return a.isPlayer ? -1 : 1;
      return strengthOrder.indexOf(a.rosterStrengthBand) - strengthOrder.indexOf(b.rosterStrengthBand);
    });
    return results;
  }, [world, playerHeyaId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Eye className="h-5 w-5 text-primary" />
        <h3 className="font-display font-semibold">Stable Perception Intel</h3>
        <Badge variant="secondary" className="text-[10px]">{snapshots.length} stables</Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        Banded intelligence on rival stables. No raw numbers — only what the sumo world reveals.
      </p>

      <ScrollArea className="max-h-[600px]">
        <div className="space-y-2 pr-2">
          {snapshots.map((snap) => (
            <Card
              key={snap.heyaId}
              className={`paper cursor-pointer hover:border-primary/50 transition-all ${snap.isPlayer ? "border-primary/30 bg-primary/5" : ""}`}
              onClick={() => navigate(`/stable/${snap.heyaId}`)}
            >
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <StableName id={snap.heyaId} name={snap.heyaName} className="font-medium text-sm" />
                      {snap.isPlayer && (
                        <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">
                          Your Stable
                        </Badge>
                      )}
                      <Badge variant="outline" className={`text-[10px] capitalize ${STATURE_COLOR[snap.statureBand] ?? ""}`}>
                        {snap.statureBand}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1.5 mt-2">
                      <PerceptionChip
                        icon={Users}
                        label="Roster"
                        value={snap.rosterStrengthBand}
                        count={snap.rosterSize}
                        color={ROSTER_COLOR[snap.rosterStrengthBand]}
                      />
                      <PerceptionChip
                        icon={Heart}
                        label="Morale"
                        value={snap.moraleBand}
                        color={MORALE_COLOR[snap.moraleBand]}
                      />
                      <PerceptionChip
                        icon={Shield}
                        label="Welfare"
                        value={snap.welfareRiskBand}
                        color={WELFARE_COLOR[snap.welfareRiskBand]}
                      />
                      <PerceptionChip
                        icon={Flame}
                        label="Media"
                        value={snap.stableMediaHeatBand}
                        color={snap.stableMediaHeatBand === "blazing" ? "text-destructive" : snap.stableMediaHeatBand === "hot" ? "text-orange-400" : "text-muted-foreground"}
                      />
                    </div>

                    {/* Additional intel row */}
                    <div className="flex gap-3 mt-2 text-[10px] text-muted-foreground flex-wrap">
                      <span>Prestige: <strong className="text-foreground capitalize">{snap.prestigeBand}</strong></span>
                      <span>Finances: <strong className="text-foreground capitalize">{snap.runwayBand}</strong></span>
                      <span>Rivalry: <strong className="text-foreground capitalize">{snap.rivalryPressureBand}</strong></span>
                      <span>Style: <strong className="text-foreground capitalize">{snap.styleBias}</strong></span>
                      {snap.complianceState !== "compliant" && (
                        <span className="text-orange-400">⚠ {snap.complianceState}</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function PerceptionChip({
  icon: Icon,
  label,
  value,
  count,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  count?: number;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <Icon className="h-3 w-3 text-muted-foreground shrink-0" />
      <span className="text-muted-foreground">{label}:</span>
      <span className={`font-medium capitalize ${color ?? "text-foreground"}`}>
        {value}
        {count != null && <span className="text-muted-foreground ml-0.5">({count})</span>}
      </span>
    </div>
  );
}
