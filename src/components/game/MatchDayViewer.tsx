// MatchDayViewer.tsx - Polished match day panel with staggered animations,
// east/west color coding, and immersive bout cards

import React, { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { BoutCard } from "./BoutCard";
import type { MatchLike } from "./BoutCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CircleDot, Swords } from "lucide-react";
import { compareRanks, buildBoutPreviewUI } from "@/presenters/uiDigest";
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

export function MatchDayViewer({ matches, world, playerRikishiIds, onBoutClick, onTacticChange, playerTactics = {} }: MatchDayViewerProps) {
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
    return [...matches].sort((a, b) => {
      if (!a || !b) return 0;
      if (a.isPlayerBout !== b.isPlayerBout) return a.isPlayerBout ? -1 : 1;
      const aHeat = a.rivalry?.heat ?? 0;
      const bHeat = b.rivalry?.heat ?? 0;
      if (aHeat !== bHeat) return bHeat - aHeat;
      const aPlayed = !!a.result;
      const bPlayed = !!b.result;
      if (aPlayed !== bPlayed) return aPlayed ? 1 : -1;
      const aPos = { rank: a.eastRikishi.rank, side: a.eastRikishi.side ?? "east", rankNumber: a.eastRikishi.rankNumber };
      const bPos = { rank: b.eastRikishi.rank, side: b.eastRikishi.side ?? "east", rankNumber: b.eastRikishi.rankNumber };
      return compareRanks(aPos as any, bPos as any);
    });
  }, [matches]);

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

  const completedCount = sortedMatches.reduce((count, m) => count + (m?.result ? 1 : 0), 0);

  return (
    <>
      {previewData && (
        <BoutPreMatchOverlay
          preview={previewData}
          onDismiss={() => setPreviewBoutId(null)}
          onBegin={() => {
            const match = matches.find(m => m.boutId === previewData.boutId);
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
            {sortedMatches.map((match, idx) => {
              if (!match) return null;
              // Map the enriched match data to the format BoutCard expects if needed
              const matchRow = {
                ...match,
                east: match.eastRikishi,
                west: match.westRikishi,
              };
              return (
                <BoutCard
                  key={match.boutId || `${match.eastRikishiId}-${match.westRikishiId}-${idx}`}
                  match={matchRow as any}
                  idx={idx}
                  onBoutClick={handleBoutClick}
                  onTacticChange={onTacticChange}
                  playerTactics={playerTactics}
                />
              );
            })}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
