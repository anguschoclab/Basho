// MatchDayViewer.tsx - Polished match day panel with staggered animations,
// east/west color coding, and immersive bout cards

import React, { useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { BoutCard, getHeatBand, getH2HRecord } from "./BoutCard";
import type { MatchLike, MatchRowData } from "./BoutCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { UIRikishi } from "@/presenters/uiModels";
import type { WorldState } from "@/engine/types/world";
import type { BoutResult } from "@/engine/types/basho";
import type { RankPosition } from "@/engine/types/banzuke";
import type { RivalryHeatBand, RivalriesState  } from "@/engine/rivalries";
import { projectRikishi } from "@/presenters/uiModels";
import { compareRanks, generateH2HCommentary, getRivalry } from "@/presenters/uiDigest";
import {
  Flame,
  Thermometer,
  Snowflake,
  Star,
  Swords,
  Users,
  TrendingUp,
  AlertTriangle,
  Eye,
  CircleDot,
  HeartPulse,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────

/** Defines the structure for match like. */


/** Defines the structure for match day viewer props. */
interface MatchDayViewerProps {
  matches: MatchLike[];
  world: WorldState;
  playerRikishiIds: Set<string>;
  onBoutClick?: (match: MatchLike) => void;
  onTacticChange?: (boutId: string, tactic: string) => void;
  playerTactics?: Record<string, string>;
  onSimulateBout?: (index: number) => void;
  onSimulateAll?: () => void;
  onEndDay?: () => void;
  highlightRikishiId?: string;
}

// ── Helpers ────────────────────────────────────────────

/**
 * Get heat band.
 *  * @param heat - The Heat.
 *  * @returns The result.
 */
export function MatchDayViewer({ matches, world, playerRikishiIds, onBoutClick, onTacticChange, playerTactics = {} }: MatchDayViewerProps) {
  const navigate = useNavigate();

  const resolvedMatches = useMemo(() => {
    return matches.reduce<Array<MatchLike & {
      east: UIRikishi;
      west: UIRikishi;
      h2h: { wins: number; losses: number };
      rivalry: any;
      heatBand: RivalryHeatBand | null;
      isPlayerBout: boolean;
      h2hCommentary: string;
    }>>((acc, match) => {
      const east = world.rikishi.get(match.eastRikishiId);
      const west = world.rikishi.get(match.westRikishiId);
      if (!east || !west) return acc;

      const h2h = getH2HRecord(projectRikishi(east, world), projectRikishi(west, world));
      const rivalriesState = (world as any).rivalriesState as RivalriesState | undefined;
      const rivalry = rivalriesState ? getRivalry(rivalriesState, east.id, west.id) : null;
      const heatBand = rivalry ? getHeatBand(rivalry.heat) : null;
      const isPlayerBout = playerRikishiIds.has(east.id) || playerRikishiIds.has(west.id);
      const h2hCommentary = generateH2HCommentary(east as any, west as any);

      acc.push({ 
        ...match, 
        east: projectRikishi(east, world), 
        west: projectRikishi(west, world), 
        h2h, 
        rivalry, 
        heatBand, 
        isPlayerBout, 
        h2hCommentary 
      });
      return acc;
    }, []);
  }, [matches, world, playerRikishiIds]);

  const sortedMatches = useMemo(() => {
    return [...resolvedMatches].sort((a, b) => {
      if (!a || !b) return 0;
      if (a.isPlayerBout !== b.isPlayerBout) return a.isPlayerBout ? -1 : 1;
      const aHeat = a.rivalry?.heat ?? 0;
      const bHeat = b.rivalry?.heat ?? 0;
      if (aHeat !== bHeat) return bHeat - aHeat;
      const aPlayed = !!a.result;
      const bPlayed = !!b.result;
      if (aPlayed !== bPlayed) return aPlayed ? 1 : -1;
      const aPos = { rank: a.east.rank, side: a.east.side ?? "east", rankNumber: a.east.rankNumber } as RankPosition;
      const bPos = { rank: b.east.rank, side: b.east.side ?? "east", rankNumber: b.east.rankNumber } as RankPosition;
      return compareRanks(aPos, bPos);
    });
  }, [resolvedMatches]);

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
        {/* Thin east/west color bar at top */}
        <div className="flex h-0.5">
          <div className="flex-1 bg-east/30" />
          <div className="flex-1 bg-west/30" />
        </div>

        <div className="divide-y divide-border/50 max-h-[620px] overflow-auto">
          {sortedMatches.map((match, idx) => {
            if (!match) return null;
            return (
              <BoutCard
                key={match.boutId || `${match.eastRikishiId}-${match.westRikishiId}-${idx}`}
                match={match}
                idx={idx}
                onBoutClick={onBoutClick}
                onTacticChange={onTacticChange}
                playerTactics={playerTactics}
              />
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
