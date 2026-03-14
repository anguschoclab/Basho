// PerceptionOverview.tsx — Rival stables perception panel for ScoutingPage
// Stable comparison + rikishi comparison + H2H bout history between stables

import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StableName, RikishiName } from "@/components/ClickableName";
import { Building2, Eye, Shield, Heart, TrendingUp, Flame, Users, GitCompareArrows, Swords, User } from "lucide-react";
import type { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";
import type { Rank } from "@/engine/types/banzuke";
import { buildPerceptionSnapshot, type PerceptionSnapshot, type RikishiPerception } from "@/engine/perception";

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

const HEALTH_COLOR: Record<string, string> = {
  peak: "text-emerald-400",
  good: "text-green-400",
  fair: "text-yellow-400",
  worn: "text-orange-400",
  fragile: "text-destructive",
};

const MOMENTUM_COLOR: Record<string, string> = {
  rising: "text-emerald-400",
  steady: "text-muted-foreground",
  declining: "text-destructive",
};

interface PerceptionOverviewProps {
  world: WorldState;
  playerHeyaId: string | null;
}

export function PerceptionOverview({ world, playerHeyaId }: PerceptionOverviewProps) {
  const navigate = useNavigate();
  const [compareIds, setCompareIds] = useState<[string | null, string | null]>([null, null]);
  const [comparing, setComparing] = useState(false);
  const [compareMode, setCompareMode] = useState<"stables" | "rikishi">("stables");

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
          onClick={() => { setComparing(!comparing); if (comparing) { setCompareIds([null, null]); setCompareMode("stables"); } }}
        >
          <GitCompareArrows className="h-3.5 w-3.5" />
          {comparing ? "Exit Compare" : "Compare Stables"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {comparing
          ? "Select two stables below to compare side-by-side."
          : "Banded intelligence on rival stables. No raw numbers — only what the sumo world reveals."}
      </p>

      {/* Comparison panel */}
      {comparing && snapA && snapB && (
        <StableComparisonFull
          snapA={snapA}
          snapB={snapB}
          world={world}
          compareMode={compareMode}
          setCompareMode={setCompareMode}
        />
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
                    navigate({ to: "/stable/$id", params: { id: snap.heyaId } });
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

// === Full Comparison with Tabs ===

function StableComparisonFull({
  snapA,
  snapB,
  world,
  compareMode,
  setCompareMode,
}: {
  snapA: PerceptionSnapshot;
  snapB: PerceptionSnapshot;
  world: WorldState;
  compareMode: "stables" | "rikishi";
  setCompareMode: (m: "stables" | "rikishi") => void;
}) {
  return (
    <Card className="paper border-primary/20">
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <GitCompareArrows className="h-4 w-4 text-primary" />
          {snapA.heyaName} vs {snapB.heyaName}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3">
        <Tabs value={compareMode} onValueChange={(v) => setCompareMode(v as any)}>
          <TabsList className="grid w-full max-w-xs grid-cols-3 mb-3">
            <TabsTrigger value="stables" className="gap-1 text-xs">
              <Building2 className="h-3 w-3" /> Stables
            </TabsTrigger>
            <TabsTrigger value="rikishi" className="gap-1 text-xs">
              <User className="h-3 w-3" /> Rikishi
            </TabsTrigger>
            <TabsTrigger value="h2h" className="gap-1 text-xs">
              <Swords className="h-3 w-3" /> H2H
            </TabsTrigger>
          </TabsList>

          <TabsContent value="stables">
            <StableMetricGrid snapA={snapA} snapB={snapB} />
          </TabsContent>

          <TabsContent value="rikishi">
            <RikishiComparisonGrid snapA={snapA} snapB={snapB} />
          </TabsContent>

          <TabsContent value="h2h">
            <H2HPanel heyaAId={snapA.heyaId} heyaBId={snapB.heyaId} heyaAName={snapA.heyaName} heyaBName={snapB.heyaName} world={world} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// === Stable Metric Grid ===

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

function StableMetricGrid({ snapA, snapB }: { snapA: PerceptionSnapshot; snapB: PerceptionSnapshot }) {
  return (
    <>
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
    </>
  );
}

// === Rikishi Side-by-Side Comparison ===

function RikishiComparisonGrid({ snapA, snapB }: { snapA: PerceptionSnapshot; snapB: PerceptionSnapshot }) {
  const [selectedA, setSelectedA] = useState<string | null>(snapA.rikishiPerceptions[0]?.rikishiId ?? null);
  const [selectedB, setSelectedB] = useState<string | null>(snapB.rikishiPerceptions[0]?.rikishiId ?? null);

  const rA = snapA.rikishiPerceptions.find(r => r.rikishiId === selectedA);
  const rB = snapB.rikishiPerceptions.find(r => r.rikishiId === selectedB);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-4">
        {/* Rikishi A selector */}
        <div>
          <label className="text-[10px] text-muted-foreground mb-1 block">{snapA.heyaName}</label>
          <ScrollArea className="max-h-28 border border-border rounded-md">
            <div className="p-1 space-y-0.5">
              {snapA.rikishiPerceptions.map(r => (
                <button
                  key={r.rikishiId}
                  className={`w-full text-left text-xs px-2 py-1 rounded transition-colors ${
                    selectedA === r.rikishiId ? "bg-primary/20 text-primary" : "hover:bg-secondary/50"
                  }`}
                  onClick={() => setSelectedA(r.rikishiId)}
                >
                  {r.shikona} <span className="text-muted-foreground capitalize">({r.rank})</span>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
        {/* Rikishi B selector */}
        <div>
          <label className="text-[10px] text-muted-foreground mb-1 block">{snapB.heyaName}</label>
          <ScrollArea className="max-h-28 border border-border rounded-md">
            <div className="p-1 space-y-0.5">
              {snapB.rikishiPerceptions.map(r => (
                <button
                  key={r.rikishiId}
                  className={`w-full text-left text-xs px-2 py-1 rounded transition-colors ${
                    selectedB === r.rikishiId ? "bg-primary/20 text-primary" : "hover:bg-secondary/50"
                  }`}
                  onClick={() => setSelectedB(r.rikishiId)}
                >
                  {r.shikona} <span className="text-muted-foreground capitalize">({r.rank})</span>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>

      {rA && rB ? (
        <div className="space-y-1">
          <div className="grid grid-cols-[1fr_24px_64px_24px_1fr] gap-1 text-xs font-medium pb-1 border-b border-border">
            <div className="text-right truncate text-primary">{rA.shikona}</div>
            <div />
            <div className="text-center text-muted-foreground">Metric</div>
            <div />
            <div className="truncate text-primary">{rB.shikona}</div>
          </div>
          <RikishiRow label="Rank" valA={rA.rank} valB={rB.rank} />
          <RikishiRow label="Style" valA={rA.style} valB={rB.style} />
          <RikishiRow label="Health" valA={rA.healthBand} valB={rB.healthBand} colorMapA={HEALTH_COLOR} colorMapB={HEALTH_COLOR} />
          <RikishiRow label="Momentum" valA={rA.momentum} valB={rB.momentum} colorMapA={MOMENTUM_COLOR} colorMapB={MOMENTUM_COLOR} />
          <RikishiRow label="Media" valA={rA.mediaHeatBand} valB={rB.mediaHeatBand} />
        </div>
      ) : (
        <p className="text-xs text-muted-foreground text-center py-4">Select one rikishi from each stable.</p>
      )}
    </div>
  );
}

function RikishiRow({
  label, valA, valB, colorMapA, colorMapB,
}: {
  label: string;
  valA: string;
  valB: string;
  colorMapA?: Record<string, string>;
  colorMapB?: Record<string, string>;
}) {
  return (
    <div className="grid grid-cols-[1fr_24px_64px_24px_1fr] gap-1 text-xs py-0.5 items-center">
      <div className={`text-right capitalize font-medium ${colorMapA?.[valA] ?? ""}`}>{valA}</div>
      <div />
      <div className="text-center text-muted-foreground">{label}</div>
      <div />
      <div className={`capitalize font-medium ${colorMapB?.[valB] ?? ""}`}>{valB}</div>
    </div>
  );
}

// === H2H Bout History Panel ===

function H2HPanel({
  heyaAId,
  heyaBId,
  heyaAName,
  heyaBName,
  world,
}: {
  heyaAId: string;
  heyaBId: string;
  heyaAName: string;
  heyaBName: string;
  world: WorldState;
}) {
  const h2hData = useMemo(() => {
    const heyaA = world.heyas.get(heyaAId);
    const heyaB = world.heyas.get(heyaBId);
    if (!heyaA || !heyaB) return null;

    const rikishiAIds = new Set(heyaA.rikishiIds);
    const rikishiBIds = new Set(heyaB.rikishiIds);

    let winsA = 0;
    let winsB = 0;
    const matchups: Array<{
      rikishiAId: string;
      rikishiAName: string;
      rikishiBId: string;
      rikishiBName: string;
      aWins: number;
      bWins: number;
      lastKimarite?: string;
      lastWinner?: string;
    }> = [];

    // Scan H2H records from rikishi in heya A against rikishi in heya B
    for (const rAId of rikishiAIds) {
      const rA = world.rikishi.get(rAId);
      if (!rA?.h2h) continue;

      for (const rBId of rikishiBIds) {
        const record = rA.h2h[rBId];
        if (!record || (record.wins === 0 && record.losses === 0)) continue;

        const rB = world.rikishi.get(rBId);
        if (!rB) continue;

        winsA += record.wins;
        winsB += record.losses;

        matchups.push({
          rikishiAId: rAId,
          rikishiAName: rA.shikona,
          rikishiBId: rBId,
          rikishiBName: rB.shikona,
          aWins: record.wins,
          bWins: record.losses,
          lastKimarite: record.lastMatch?.kimarite,
          lastWinner: record.lastMatch?.winnerId === rAId ? rA.shikona : rB.shikona,
        });
      }
    }

    matchups.sort((a, b) => (b.aWins + b.bWins) - (a.aWins + a.bWins));

    return { winsA, winsB, totalBouts: winsA + winsB, matchups };
  }, [world, heyaAId, heyaBId]);

  if (!h2hData) return <p className="text-xs text-muted-foreground">No data available.</p>;

  if (h2hData.totalBouts === 0) {
    return (
      <div className="text-center py-6">
        <Swords className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
        <p className="text-xs text-muted-foreground">No bouts recorded between these stables yet.</p>
        <p className="text-[10px] text-muted-foreground mt-1">H2H records build up as basho are played.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Aggregate record */}
      <div className="flex items-center justify-center gap-4 py-2">
        <div className="text-right">
          <div className="text-lg font-display font-bold text-primary">{h2hData.winsA}</div>
          <div className="text-[10px] text-muted-foreground">{heyaAName}</div>
        </div>
        <div className="text-muted-foreground text-xs font-medium">—</div>
        <div className="text-left">
          <div className="text-lg font-display font-bold text-primary">{h2hData.winsB}</div>
          <div className="text-[10px] text-muted-foreground">{heyaBName}</div>
        </div>
      </div>
      <div className="text-center text-[10px] text-muted-foreground">
        {h2hData.totalBouts} bout{h2hData.totalBouts !== 1 ? "s" : ""} across {h2hData.matchups.length} matchup{h2hData.matchups.length !== 1 ? "s" : ""}
      </div>

      {/* Win share bar */}
      {h2hData.totalBouts > 0 && (
        <div className="flex h-2 rounded-full overflow-hidden bg-muted">
          <div
            className="bg-primary transition-all"
            style={{ width: `${(h2hData.winsA / h2hData.totalBouts) * 100}%` }}
          />
          <div
            className="bg-destructive transition-all"
            style={{ width: `${(h2hData.winsB / h2hData.totalBouts) * 100}%` }}
          />
        </div>
      )}

      {/* Individual matchups */}
      <ScrollArea className="max-h-48">
        <div className="space-y-1.5 pr-2">
          {h2hData.matchups.map((m, i) => (
            <div key={i} className="flex items-center justify-between text-xs p-2 rounded bg-secondary/30">
              <div className="flex-1 text-right truncate">
                <RikishiName id={m.rikishiAId} name={m.rikishiAName} className="text-xs font-medium" />
              </div>
              <div className="mx-3 font-mono text-muted-foreground whitespace-nowrap">
                <span className={m.aWins > m.bWins ? "text-primary font-bold" : ""}>{m.aWins}</span>
                {" - "}
                <span className={m.bWins > m.aWins ? "text-primary font-bold" : ""}>{m.bWins}</span>
              </div>
              <div className="flex-1 truncate">
                <RikishiName id={m.rikishiBId} name={m.rikishiBName} className="text-xs font-medium" />
              </div>
              {m.lastKimarite && (
                <Badge variant="outline" className="text-[9px] ml-2 shrink-0">{m.lastKimarite}</Badge>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

// === Shared Components ===

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
