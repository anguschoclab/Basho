// MatchDayViewer.tsx - Shows today's scheduled bouts with H2H records and rivalry heat
// FM-style match day panel for the Basho page

import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Rikishi, WorldState, BoutResult, RankPosition } from "@/engine/types";
import { getRivalry, type RivalryHeatBand, type RivalryPairState, type RivalriesState } from "@/engine/rivalries";
import { generateH2HCommentary } from "@/engine/h2h";
import { compareRanks } from "@/engine/banzuke";
import { 
  Flame, 
  Thermometer, 
  Snowflake, 
  Star, 
  Swords, 
  Users,
  TrendingUp,
  AlertTriangle,
  Eye
} from "lucide-react";

interface MatchLike {
  day?: number;
  boutId?: string;
  eastRikishiId: string;
  westRikishiId: string;
  result?: BoutResult;
}

interface MatchDayViewerProps {
  matches: MatchLike[];
  world: WorldState;
  playerRikishiIds: Set<string>;
  onBoutClick?: (match: MatchLike) => void;
}

function getHeatBand(heat: number): RivalryHeatBand {
  if (heat >= 75) return "inferno";
  if (heat >= 50) return "hot";
  if (heat >= 25) return "warm";
  return "cold";
}

const HEAT_ICONS: Record<RivalryHeatBand, React.ReactNode> = {
  inferno: <Flame className="h-4 w-4 text-red-500" />,
  hot: <Thermometer className="h-4 w-4 text-orange-500" />,
  warm: <Thermometer className="h-4 w-4 text-amber-500" />,
  cold: <Snowflake className="h-4 w-4 text-blue-400" />,
};

const HEAT_LABELS: Record<RivalryHeatBand, string> = {
  inferno: "Inferno Rivalry",
  hot: "Heated Rivalry",
  warm: "Warm Rivalry",
  cold: "Cold",
};

const HEAT_COLORS: Record<RivalryHeatBand, string> = {
  inferno: "bg-red-500/20 text-red-400 border-red-500/30",
  hot: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  warm: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  cold: "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

function getH2HRecord(r1: Rikishi, r2: Rikishi): { wins: number; losses: number } {
  const record = r1.h2h?.[r2.id];
  if (!record) return { wins: 0, losses: 0 };
  return { wins: record.wins, losses: record.losses };
}

export function MatchDayViewer({ matches, world, playerRikishiIds, onBoutClick }: MatchDayViewerProps) {
  const navigate = useNavigate();

  const resolvedMatches = useMemo(() => {
    return matches.map((match) => {
      const east = world.rikishi.get(match.eastRikishiId);
      const west = world.rikishi.get(match.westRikishiId);
      
      if (!east || !west) return null;

      const h2h = getH2HRecord(east, west);
      const rivalriesState = (world as any).rivalriesState as RivalriesState | undefined;
      const rivalry = rivalriesState ? getRivalry(rivalriesState, east.id, west.id) : null;
      const heatBand = rivalry ? getHeatBand(rivalry.heat) : null;
      const isPlayerBout = playerRikishiIds.has(east.id) || playerRikishiIds.has(west.id);
      const h2hCommentary = generateH2HCommentary(east, west);

      return {
        ...match,
        east,
        west,
        h2h,
        rivalry,
        heatBand,
        isPlayerBout,
        h2hCommentary,
      };
    }).filter(Boolean);
  }, [matches, world, playerRikishiIds]);

  // Sort: player bouts first, then by rivalry heat, then unplayed first
  const sortedMatches = useMemo(() => {
    return [...resolvedMatches].sort((a, b) => {
      if (!a || !b) return 0;
      
      // Player bouts first
      if (a.isPlayerBout !== b.isPlayerBout) return a.isPlayerBout ? -1 : 1;
      
      // Hot rivalries next
      const aHeat = a.rivalry?.heat ?? 0;
      const bHeat = b.rivalry?.heat ?? 0;
      if (aHeat !== bHeat) return bHeat - aHeat;
      
      // Unplayed first
      const aPlayed = !!a.result;
      const bPlayed = !!b.result;
      if (aPlayed !== bPlayed) return aPlayed ? 1 : -1;

      // Then by rank (higher-ranked bouts first)
      const aPos = { rank: a.east.rank, side: a.east.side ?? "east", rankNumber: a.east.rankNumber } as RankPosition;
      const bPos = { rank: b.east.rank, side: b.east.side ?? "east", rankNumber: b.east.rankNumber } as RankPosition;
      return compareRanks(aPos, bPos);
    });
  }, [resolvedMatches]);

  if (sortedMatches.length === 0) {
    return (
      <Card className="paper">
        <CardContent className="py-8 text-center text-muted-foreground">
          No matches scheduled for today.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="paper">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Swords className="h-5 w-5" />
          Today's Card
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 max-h-[600px] overflow-auto">
        {sortedMatches.map((match, idx) => {
          if (!match) return null;
          const hasResult = !!match.result;

          return (
            <div
              key={match.boutId || `${match.eastRikishiId}-${match.westRikishiId}-${idx}`}
              onClick={() => hasResult && onBoutClick?.(match)}
              className={`
                p-4 rounded-lg transition-all
                ${hasResult ? "cursor-pointer hover:bg-secondary/60" : ""}
                ${match.isPlayerBout ? "ring-2 ring-primary/50 ring-offset-1 ring-offset-background" : ""}
                ${match.heatBand && match.heatBand !== "cold" ? "bg-gradient-to-r from-secondary/50 to-transparent" : "bg-secondary/30"}
              `}
            >
              {/* Main Bout Row */}
              <div className="flex items-center gap-3">
                {match.isPlayerBout && <Star className="h-4 w-4 text-primary shrink-0" fill="currentColor" />}

                {/* East Rikishi */}
                <div className="flex-1 text-right min-w-0">
                  <div 
                    className={`font-display truncate cursor-pointer hover:text-primary transition-colors ${
                      match.result?.winner === "east" ? "font-bold text-success" : ""
                    }`}
                    onClick={(e) => { e.stopPropagation(); navigate(`/rikishi/${match.east.id}`); }}
                  >
                    {match.east.shikona}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {match.east.currentBashoWins ?? 0}-{match.east.currentBashoLosses ?? 0}
                  </div>
                </div>

                {/* H2H Center */}
                <div className="shrink-0 w-20 text-center">
                  <div className="text-xs text-muted-foreground mb-0.5">H2H</div>
                  <div className="font-mono text-sm font-medium">
                    <span className={match.h2h.wins > match.h2h.losses ? "text-success" : ""}>
                      {match.h2h.wins}
                    </span>
                    <span className="text-muted-foreground mx-1">-</span>
                    <span className={match.h2h.losses > match.h2h.wins ? "text-success" : ""}>
                      {match.h2h.losses}
                    </span>
                  </div>
                </div>

                {/* West Rikishi */}
                <div className="flex-1 min-w-0">
                  <div 
                    className={`font-display truncate cursor-pointer hover:text-primary transition-colors ${
                      match.result?.winner === "west" ? "font-bold text-success" : ""
                    }`}
                    onClick={(e) => { e.stopPropagation(); navigate(`/rikishi/${match.west.id}`); }}
                  >
                    {match.west.shikona}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {match.west.currentBashoWins ?? 0}-{match.west.currentBashoLosses ?? 0}
                  </div>
                </div>

                {/* Result/Status */}
                <div className="shrink-0 flex items-center gap-2">
                  {hasResult ? (
                    <>
                      <Badge variant="outline" className="text-xs">
                        {match.result?.kimariteName ?? "—"}
                      </Badge>
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    </>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      Pending
                    </Badge>
                  )}
                </div>
              </div>

              {/* Rivalry & H2H Commentary */}
              <div className="mt-2 flex items-center gap-3 flex-wrap">
                {/* Rivalry Heat Badge */}
                {match.heatBand && match.heatBand !== "cold" && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className={`text-xs ${HEAT_COLORS[match.heatBand]} border`}>
                        {HEAT_ICONS[match.heatBand]}
                        <span className="ml-1">{HEAT_LABELS[match.heatBand]}</span>
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs text-sm">
                        {match.rivalry?.tone && (
                          <span className="capitalize">{match.rivalry.tone.replace("_", " ")} rivalry</span>
                        )}
                        {match.rivalry && ` • ${match.rivalry.meetings} meetings`}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                )}

                {/* First Meeting Badge */}
                {match.h2h.wins === 0 && match.h2h.losses === 0 && (
                  <Badge variant="secondary" className="text-xs">
                    <Users className="h-3 w-3 mr-1" />
                    First Meeting
                  </Badge>
                )}

                {/* Streak Indicator */}
                {(match.east.h2h?.[match.west.id]?.streak ?? 0) >= 3 && (
                  <Badge variant="outline" className="text-xs text-success border-success/30">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    {match.east.shikona} on {match.east.h2h?.[match.west.id]?.streak ?? 0}-win streak
                  </Badge>
                )}
                {(match.east.h2h?.[match.west.id]?.streak ?? 0) <= -3 && (
                  <Badge variant="outline" className="text-xs text-destructive border-destructive/30">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {match.east.shikona} on {Math.abs(match.east.h2h?.[match.west.id]?.streak ?? 0)}-loss streak
                  </Badge>
                )}
              </div>

              {/* H2H Commentary (abbreviated) */}
              {match.h2hCommentary && (match.h2h.wins > 0 || match.h2h.losses > 0) && (
                <p className="mt-2 text-xs text-muted-foreground italic line-clamp-1">
                  {match.h2hCommentary}
                </p>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
