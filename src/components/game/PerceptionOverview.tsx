// PerceptionOverview.tsx — Rival stables perception panel for ScoutingPage
// Stable comparison + rikishi comparison + H2H bout history between stables

import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Eye, GitCompareArrows, Swords, Building2, User } from "lucide-react";
import { useGame } from "@/contexts/useGame";
import { buildPerceptionSnapshot } from "@/presenters/uiDigest";
import type { PerceptionSnapshot } from "@/engine/perception";
import {
  StableMetricGrid,
  RikishiComparisonGrid,
  H2HPanel,
  StablePerceptionCard,
} from "./perceptionComponents";

export function PerceptionOverview({ playerHeyaId }: { playerHeyaId: string | null }) {
  const navigate = useNavigate();
  const { state } = useGame();
  const world = state.world;
  const [compareIds, setCompareIds] = useState<[string | null, string | null]>([null, null]);
  const [comparing, setComparing] = useState(false);
  const [compareMode, setCompareMode] = useState<"stables" | "rikishi" | "h2h">("stables");

  type SnapshotEntry = PerceptionSnapshot & { isPlayer: boolean };

  const { snapshots, snapMap } = useMemo(() => {
    if (!world) return { snapshots: [], snapMap: new Map() };
    const results: Array<SnapshotEntry> = [];
    const map = new Map<string, SnapshotEntry>();
    for (const heya of world.heyas.values()) {
      if ((heya.rikishiIds?.length ?? 0) === 0) continue;
      const snap = buildPerceptionSnapshot(world, heya.id);
      const entry = { ...snap, isPlayer: heya.id === playerHeyaId };
      results.push(entry);
      map.set(heya.id, entry);
    }
    const strengthOrder = ["dominant", "strong", "competitive", "developing", "weak"];
    results.sort((a, b) => {
      if (a.isPlayer !== b.isPlayer) return a.isPlayer ? -1 : 1;
      return (
        strengthOrder.indexOf(a.rosterStrengthBand) - strengthOrder.indexOf(b.rosterStrengthBand)
      );
    });
    return { snapshots: results, snapMap: map };
  }, [world, playerHeyaId]);

  const handleNavigate = (heyaId: string) => {
    navigate({ to: `/stable?id=${heyaId}` });
  };

  const handleToggleCompare = (heyaId: string) => {
    setCompareIds((prev) => {
      if (prev[0] === heyaId) return [null, prev[1]];
      if (prev[1] === heyaId) return [prev[0], null];
      if (!prev[0]) return [heyaId, prev[1]];
      if (!prev[1]) return [prev[0], heyaId];
      return [prev[1], heyaId];
    });
  };

  const snapA = compareIds[0] ? snapMap.get(compareIds[0]) || null : null;
  const snapB = compareIds[1] ? snapMap.get(compareIds[1]) || null : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Eye className="h-5 w-5 text-primary" />
        <h3 className="font-display font-semibold">Stable Perception Intel</h3>
        <Badge variant="secondary" className="text-[10px]">
          {snapshots.length} stables
        </Badge>
        <Button
          variant={comparing ? "default" : "outline"}
          size="sm"
          className="ml-auto gap-1.5 h-7 text-xs"
          onClick={() => {
            setComparing(!comparing);
            if (comparing) {
              setCompareIds([null, null]);
              setCompareMode("stables");
            }
          }}
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
        <Card className="paper border-primary/20">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <GitCompareArrows className="h-4 w-4 text-primary" />
              {snapA.heyaName} vs {snapB.heyaName}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <Tabs
              value={compareMode}
              onValueChange={(v) => setCompareMode(v as "stables" | "rikishi" | "h2h")}
            >
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
                <H2HPanel heyaAId={snapA.heyaId} heyaBId={snapB.heyaId} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
      {comparing && (!snapA || !snapB) && (
        <div className="text-xs text-muted-foreground border border-dashed border-primary/30 rounded-lg p-4 text-center">
          {!snapA && !snapB
            ? "Pick two stables from the list below."
            : "Pick one more stable to compare."}
        </div>
      )}

      <ScrollArea className="max-h-[600px]">
        <div className="space-y-2 pr-2">
          {snapshots.map((snap) => {
            const isSelected = compareIds[0] === snap.heyaId || compareIds[1] === snap.heyaId;
            return (
              <StablePerceptionCard
                key={snap.heyaId}
                snap={snap}
                comparing={comparing}
                isSelected={isSelected}
                onToggleCompare={handleToggleCompare}
                onNavigate={handleNavigate}
              />
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
