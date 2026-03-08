// PerceptionOverview.tsx — Rival stables perception panel for ScoutingPage
// Uses buildPerceptionSnapshot from perception.ts for banded intel
// Includes side-by-side comparison mode

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StableName } from "@/components/ClickableName";
import { Building2, Eye, Shield, Heart, TrendingUp, Flame, Users, GitCompareArrows } from "lucide-react";
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
  const [compareIds, setCompareIds] = useState<[string | null, string | null]>([null, null]);
  const [comparing, setComparing] = useState(false);

  const snapshots = useMemo(() => {
    const results: Array<PerceptionSnapshot & { isPlayer: boolean }> = [];
    for (const heya of world.heyas.values()) {
      if (heya.rikishiIds.length === 0) continue;
      const snap = buildPerceptionSnapshot(world, heya.id);
      results.push({ ...snap, isPlayer: heya.id === playerHeyaId });
    }
    const strengthOrder = ["dominant", "strong", "competitive", "developing", "weak"];
    results.sort((a, b) => {
      if (a.isPlayer !== b.isPlayer) return a.isPlayer ? -1 : 1;
      return strengthOrder.indexOf(a.rosterStrengthBand) - strengthOrder.indexOf(b.rosterStrengthBand);
    });
    return results;
  }, [world, playerHeyaId]);

  const handleToggleCompare = (heyaId: string) => {
    setCompareIds(prev => {
      if (prev[0] === heyaId) return [null, prev[1]];
      if (prev[1] === heyaId) return [prev[0], null];
      if (!prev[0]) return [heyaId, prev[1]];
      if (!prev[1]) return [prev[0], heyaId];
      return [prev[1], heyaId];
    });
  };

  const snapA = compareIds[0] ? snapshots.find(s => s.heyaId === compareIds[0]) : null;
  const snapB = compareIds[1] ? snapshots.find(s => s.heyaId === compareIds[1]) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Eye className="h-5 w-5 text-primary" />
        <h3 className="font-display font-semibold">Stable Perception Intel</h3>
        <Badge variant="secondary" className="text-[10px]">{snapshots.length} stables</Badge>
        <Button
          variant={comparing ? "default" : "outline"}
          size="sm"
          className="ml-auto gap-1.5 h-7 text-xs"
          onClick={() => { setComparing(!comparing); if (comparing) setCompareIds([null, null]); }}
        >
          <GitCompareArrows className="h-3.5 w-3.5" />
          {comparing ? "Exit Compare" : "Compare"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {comparing
          ? "Select two stables below to compare side-by-side."
          : "Banded intelligence on rival stables. No raw numbers — only what the sumo world reveals."}
      </p>

      {/* Comparison panel */}
      {comparing && snapA && snapB && (
        <ComparisonPanel snapA={snapA} snapB={snapB} />
      )}
      {comparing && (!snapA || !snapB) && (
        <div className="text-xs text-muted-foreground border border-dashed border-primary/30 rounded-lg p-4 text-center">
          {!snapA && !snapB ? "Pick two stables from the list below." : "Pick one more stable to compare."}
        </div>
      )}

      <ScrollArea className="max-h-[600px]">
        <div className="space-y-2 pr-2">
          {snapshots.map((snap) => {
            const isSelected = compareIds[0] === snap.heyaId || compareIds[1] === snap.heyaId;
            return (
              <Card
                key={snap.heyaId}
                className={`paper cursor-pointer hover:border-primary/50 transition-all ${snap.isPlayer ? "border-primary/30 bg-primary/5" : ""} ${isSelected ? "ring-2 ring-primary" : ""}`}
                onClick={(e) => {
                  if (comparing) {
                    e.preventDefault();
                    handleToggleCompare(snap.heyaId);
                  } else {
                    navigate(`/stable/${snap.heyaId}`);
                  }
                }}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {comparing ? (
                          <span className="font-medium text-sm">{snap.heyaName}</span>
                        ) : (
                          <StableName id={snap.heyaId} name={snap.heyaName} className="font-medium text-sm" />
                        )}
                        {snap.isPlayer && (
                          <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">
                            Your Stable
                          </Badge>
                        )}
                        <Badge variant="outline" className={`text-[10px] capitalize ${STATURE_COLOR[snap.statureBand] ?? ""}`}>
                          {snap.statureBand}
                        </Badge>
                        {comparing && isSelected && (
                          <Badge variant="default" className="text-[10px]">Selected</Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1.5 mt-2">
                        <PerceptionChip icon={Users} label="Roster" value={snap.rosterStrengthBand} count={snap.rosterSize} color={ROSTER_COLOR[snap.rosterStrengthBand]} />
                        <PerceptionChip icon={Heart} label="Morale" value={snap.moraleBand} color={MORALE_COLOR[snap.moraleBand]} />
                        <PerceptionChip icon={Shield} label="Welfare" value={snap.welfareRiskBand} color={WELFARE_COLOR[snap.welfareRiskBand]} />
                        <PerceptionChip icon={Flame} label="Media" value={snap.stableMediaHeatBand} color={snap.stableMediaHeatBand === "blazing" ? "text-destructive" : snap.stableMediaHeatBand === "hot" ? "text-orange-400" : "text-muted-foreground"} />
                      </div>

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
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

// === Comparison Panel ===

const COMPARE_ROWS: Array<{
  label: string;
  icon: React.ElementType;
  get: (s: PerceptionSnapshot) => string;
  colorMap?: Record<string, string>;
}> = [
  { label: "Stature", icon: Building2, get: s => s.statureBand, colorMap: STATURE_COLOR },
  { label: "Roster", icon: Users, get: s => `${s.rosterStrengthBand} (${s.rosterSize})`, colorMap: ROSTER_COLOR },
  { label: "Morale", icon: Heart, get: s => s.moraleBand, colorMap: MORALE_COLOR },
  { label: "Welfare", icon: Shield, get: s => s.welfareRiskBand, colorMap: WELFARE_COLOR },
  { label: "Prestige", icon: TrendingUp, get: s => s.prestigeBand },
  { label: "Finances", icon: Building2, get: s => s.runwayBand },
  { label: "Media Heat", icon: Flame, get: s => s.stableMediaHeatBand },
  { label: "Rivalry", icon: Flame, get: s => s.rivalryPressureBand },
  { label: "Style Bias", icon: Eye, get: s => String(s.styleBias) },
  { label: "Compliance", icon: Shield, get: s => s.complianceState },
];

function ComparisonPanel({ snapA, snapB }: { snapA: PerceptionSnapshot; snapB: PerceptionSnapshot }) {
  return (
    <Card className="paper border-primary/20">
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <GitCompareArrows className="h-4 w-4 text-primary" />
          Side-by-Side Comparison
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3">
        <div className="grid grid-cols-[1fr_24px_80px_24px_1fr] gap-1 text-xs font-medium mb-2 pb-1 border-b border-border">
          <div className="text-right truncate text-primary">{snapA.heyaName}</div>
          <div />
          <div className="text-center text-muted-foreground">Metric</div>
          <div />
          <div className="truncate text-primary">{snapB.heyaName}</div>
        </div>
        {COMPARE_ROWS.map(row => {
          const valA = row.get(snapA);
          const valB = row.get(snapB);
          const bandA = valA.split(" ")[0];
          const bandB = valB.split(" ")[0];
          const colorA = row.colorMap?.[bandA] ?? "";
          const colorB = row.colorMap?.[bandB] ?? "";
          return (
            <div key={row.label} className="grid grid-cols-[1fr_24px_80px_24px_1fr] gap-1 text-xs py-1 items-center">
              <div className={`text-right capitalize font-medium ${colorA}`}>{valA}</div>
              <div className="flex justify-center"><row.icon className="h-3 w-3 text-muted-foreground" /></div>
              <div className="text-center text-muted-foreground">{row.label}</div>
              <div />
              <div className={`capitalize font-medium ${colorB}`}>{valB}</div>
            </div>
          );
        })}
      </CardContent>
    </Card>
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
