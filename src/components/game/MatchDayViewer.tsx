// MatchDayViewer.tsx - Polished match day panel with staggered animations,
// east/west color coding, and immersive bout cards

import { useMemo, useState } from "react";
import { BoutCard } from "./BoutCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CircleDot, Swords } from "lucide-react";
import { compareRanks, buildBoutPreviewUI } from "@/presenters/uiDigest";
import type { RankPosition } from "@/engine/types/banzuke";
import { BoutPreMatchOverlay } from "./BoutPreMatchOverlay";

// ── Types ──────────────────────────────────────────────

/** Defines the structure for match day viewer props. */
interface MatchDayViewerProps {
  matches: any[]; // enriched via projectBashoUIDigest
  world: any;
  playerRikishiIds: Set<string>;
  onBoutClick?: (match: any) => void;
  onTacticChange?: (boutId: string, tactic: string) => void;
  playerTactics?: Record<string, string>;
  onSimulateBout?: (index: number) => void;
  onSimulateAll?: () => void;
  onEndDay?: () => void;
  highlightRikishiId?: string;
}

// ── Main Component ─────────────────────────────────────

export function MatchDayViewer({
  matches,
  world,
  onBoutClick,
  onTacticChange,
  playerTactics = {},
}: MatchDayViewerProps) {
  const [previewBoutId, setPreviewBoutId] = useState<string | null>(null);

  const previewData = useMemo(() => {
    if (!previewBoutId) return null;
    return buildBoutPreviewUI(previewBoutId, world);
  }, [previewBoutId, world]);

  const handleBoutClick = (match: any) => {
    // Show pre-match overlay for pending player bouts
    if (match.boutId && !match.result && match.isPlayerBout) {
      setPreviewBoutId(match.boutId);
      return;
    }
    onBoutClick?.(match);
  };

  const sortedMatches = useMemo(() => {
    const scouting = world?.playerKnowledge?.scouting;
    const mapped = [...matches].map((m) => {
      if (!m) return m;
      const enriched = {
        ...m,
        east: m.eastRikishi,
        west: m.westRikishi,
      };
      if (enriched.isPlayerBout && scouting) {
        const opponentId =
          enriched.eastRikishi?.isPlayerOwned === false
            ? enriched.eastRikishi?.id
            : enriched.westRikishi?.isPlayerOwned === false
              ? enriched.westRikishi?.id
              : null;
        if (opponentId) {
          const scouted = scouting[opponentId];
          if (scouted?.publicInfo?.archetype) {
            enriched.scoutHint = `Scouting: likely ${scouted.publicInfo.archetype} fighter (Lvl ${scouted.scoutingLevel})`;
          }
        }
      }
      return enriched;
    });
    return mapped.sort((a, b) => {
      if (!a || !b) return 0;
      if (a.isPlayerBout !== b.isPlayerBout) return a.isPlayerBout ? -1 : 1;
      const aHeat = a.rivalry?.heat ?? 0;
      const bHeat = b.rivalry?.heat ?? 0;
      if (aHeat !== bHeat) return bHeat - aHeat;
      const aPlayed = !!a.result;
      const bPlayed = !!b.result;
      if (aPlayed !== bPlayed) return aPlayed ? 1 : -1;
      const aPos = {
        rank: a.eastRikishi.rank,
        side: a.eastRikishi.side ?? "east",
        rankNumber: a.eastRikishi.rankNumber,
      };
      const bPos = {
        rank: b.eastRikishi.rank,
        side: b.eastRikishi.side ?? "east",
        rankNumber: b.eastRikishi.rankNumber,
      };
      return compareRanks(aPos as unknown as RankPosition, bPos as unknown as RankPosition);
    });
  }, [matches]);

  const completedCount = useMemo(() => {
    let count = 0;
    for (const m of sortedMatches) if (m?.result) count++;
    return count;
  }, [sortedMatches]);

  if (sortedMatches.length === 0) {
    return (
      <Card className="paper">
        <CardContent className="py-12 text-center">
          <CircleDot className="h-8 w-8 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground text-sm">No matches scheduled for today.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {previewData && (
        <BoutPreMatchOverlay
          preview={previewData}
          onDismiss={() => setPreviewBoutId(null)}
          onBegin={() => {
            const match = matches.find((m) => m.boutId === previewData.boutId);
            setPreviewBoutId(null);
            if (match) onBoutClick?.(match);
          }}
        />
      )}
      <Card className="paper overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Swords className="h-4.5 w-4.5" />
              Today's Card
            </CardTitle>
            <Badge variant="secondary" className="font-mono text-xs">
              {completedCount}/{sortedMatches.length}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="flex h-0.5">
            <div className="flex-1 bg-east/30" />
            <div className="flex-1 bg-west/30" />
          </div>

          <div className="divide-y divide-border/50 max-h-[620px] overflow-auto">
            {(() => {
              const limit = sortedMatches.length;
              const nodes = new Array(limit);
              for (let i = 0; i < limit; i++) {
                const match = sortedMatches[i];
                if (!match) continue;
                nodes[i] = (
                  <BoutCard
                    key={match.boutId || `${match.eastRikishiId}-${match.westRikishiId}-${i}`}
                    match={match}
                    idx={i}
                    onBoutClick={handleBoutClick}
                    onTacticChange={onTacticChange}
                    playerTactics={playerTactics}
                  />
                );
              }
              return nodes;
            })()}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
