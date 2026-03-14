// MatchDayViewer.tsx - Polished match day panel with staggered animations,
// east/west color coding, and immersive bout cards

import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Rikishi, WorldState, BoutResult, RankPosition } from "@/engine/types";
import { getRivalry, type RivalryHeatBand, type RivalriesState } from "@/engine/rivalries";
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
  Eye,
  CircleDot,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────

/** Defines the structure for match like. */
interface MatchLike {
  day?: number;
  boutId?: string;
  eastRikishiId: string;
  westRikishiId: string;
  result?: BoutResult;
}

/** Defines the structure for match day viewer props. */
interface MatchDayViewerProps {
  matches: MatchLike[];
  world: WorldState;
  playerRikishiIds: Set<string>;
  onBoutClick?: (match: MatchLike) => void;
}

// ── Helpers ────────────────────────────────────────────

/**
 * Get heat band.
 *  * @param heat - The Heat.
 *  * @returns The result.
 */
function getHeatBand(heat: number): RivalryHeatBand {
  if (heat >= 75) return "inferno";
  if (heat >= 50) return "hot";
  if (heat >= 25) return "warm";
  return "cold";
}

const HEAT_CONFIG: Record<RivalryHeatBand, { icon: React.ReactNode; label: string; classes: string }> = {
  inferno: {
    icon: <Flame className="h-3.5 w-3.5" />,
    label: "Inferno Rivalry",
    classes: "bg-destructive/15 text-destructive border-destructive/25",
  },
  hot: {
    icon: <Thermometer className="h-3.5 w-3.5" />,
    label: "Heated Rivalry",
    classes: "bg-warning/15 text-warning border-warning/25",
  },
  warm: {
    icon: <Thermometer className="h-3.5 w-3.5" />,
    label: "Warm Rivalry",
    classes: "bg-warning/10 text-warning/80 border-warning/20",
  },
  cold: {
    icon: <Snowflake className="h-3.5 w-3.5" />,
    label: "Cold",
    classes: "bg-muted text-muted-foreground border-border",
  },
};

/**
 * Get h2 h record.
 *  * @param r1 - The R1.
 *  * @param r2 - The R2.
 */
function getH2HRecord(r1: Rikishi, r2: Rikishi) {
  const record = r1.h2h?.[r2.id];
  return record ? { wins: record.wins, losses: record.losses } : { wins: 0, losses: 0 };
}

// ── Sub-components ─────────────────────────────────────

/**
 * rikishi side.
 *  * @param {
 *   rikishi,
 *   side,
 *   isWinner,
 *   onClick,
 * } - The {
 *   rikishi,
 *   side,
 *   is winner,
 *   on click,
 * }.
 */
function RikishiSide({
  rikishi,
  side,
  isWinner,
  onClick,
}: {
  rikishi: Rikishi;
  side: "east" | "west";
  isWinner: boolean;
  onClick: () => void;
}) {
  const isEast = side === "east";
  return (
    <div className={`flex-1 min-w-0 ${isEast ? "text-right" : "text-left"}`}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className={`
          font-display text-sm truncate max-w-full
          transition-colors hover:text-primary cursor-pointer
          ${isWinner ? "font-bold winner-glow text-success" : "text-foreground"}
        `}
      >
        {rikishi.shikona}
      </button>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5"
        style={{ justifyContent: isEast ? "flex-end" : "flex-start" }}
      >
        <span className="font-mono">
          {rikishi.currentBashoWins ?? 0}-{rikishi.currentBashoLosses ?? 0}
        </span>
        <span className={`h-1.5 w-1.5 rounded-full ${isEast ? "bg-east" : "bg-west"}`} />
      </div>
    </div>
  );
}

/**
 * h2 h center.
 *  * @param { wins, losses } - The { wins, losses }.
 */
function H2HCenter({ wins, losses }: { wins: number; losses: number }) {
  return (
    <div className="vs-divider shrink-0 w-16 text-center px-1">
      <div className="font-mono text-xs font-semibold tracking-wide">
        <span className={wins > losses ? "text-success" : "text-foreground"}>{wins}</span>
        <span className="text-muted-foreground mx-0.5">–</span>
        <span className={losses > wins ? "text-success" : "text-foreground"}>{losses}</span>
      </div>
      <div className="text-[9px] text-muted-foreground uppercase tracking-widest mt-0.5">H2H</div>
    </div>
  );
}

/**
 * bout tags.
 *  * @param {
 *   match,
 * } - The {
 *   match,
 * }.
 */
function BoutTags({
  match,
}: {
  match: NonNullable<ReturnType<typeof useResolvedMatch>>;
}) {
  const { heatBand, rivalry, h2h, east, west } = match;
  const streak = east.h2h?.[west.id]?.streak ?? 0;

  return (
    <div className="flex items-center gap-1.5 flex-wrap mt-2">
      {/* Rivalry badge */}
      {heatBand && heatBand !== "cold" && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className={`text-[10px] gap-1 ${HEAT_CONFIG[heatBand].classes} border`}>
              {HEAT_CONFIG[heatBand].icon}
              {HEAT_CONFIG[heatBand].label}
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="text-xs max-w-[200px]">
              {rivalry?.tone && <span className="capitalize">{rivalry.tone.replace("_", " ")}</span>}
              {rivalry && ` · ${rivalry.meetings} meetings`}
            </p>
          </TooltipContent>
        </Tooltip>
      )}

      {/* First meeting */}
      {h2h.wins === 0 && h2h.losses === 0 && (
        <Badge variant="secondary" className="text-[10px] gap-1">
          <Users className="h-3 w-3" /> First Meeting
        </Badge>
      )}

      {/* Win streak */}
      {streak >= 3 && (
        <Badge variant="outline" className="text-[10px] text-success border-success/25 gap-1">
          <TrendingUp className="h-3 w-3" />
          {east.shikona} {streak}W streak
        </Badge>
      )}
      {streak <= -3 && (
        <Badge variant="outline" className="text-[10px] text-destructive border-destructive/25 gap-1">
          <AlertTriangle className="h-3 w-3" />
          {east.shikona} {Math.abs(streak)}L streak
        </Badge>
      )}
    </div>
  );
}

// Just a type helper for the resolved match shape
/** Use resolved match. */
function useResolvedMatch() {
  return null as any;
}

// ── Main Component ─────────────────────────────────────

/**
 * match day viewer.
 *  * @param { matches, world, playerRikishiIds, onBoutClick } - The { matches, world, player rikishi ids, on bout click }.
 */
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

      return { ...match, east, west, h2h, rivalry, heatBand, isPlayerBout, h2hCommentary };
    }).filter(Boolean);
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
            const hasResult = !!match.result;

            return (
              <div
                key={match.boutId || `${match.eastRikishiId}-${match.westRikishiId}-${idx}`}
                onClick={() => hasResult && onBoutClick?.(match)}
                className={`
                  bout-card bout-enter p-3 px-4
                  ${hasResult ? "cursor-pointer" : ""}
                  ${match.isPlayerBout ? "bout-card--player bg-primary/[0.03]" : ""}
                  ${hasResult ? "bg-card" : "bg-card/60"}
                `}
              >
                {/* Main row */}
                <div className="flex items-center gap-2">
                  {/* Player star */}
                  {match.isPlayerBout && (
                    <Star className="h-3.5 w-3.5 text-primary shrink-0" fill="currentColor" />
                  )}

                  {/* East */}
                  <RikishiSide
                    rikishi={match.east}
                    side="east"
                    isWinner={match.result?.winner === "east"}
                    onClick={() => navigate(`/rikishi/${match.east.id}`)}
                  />

                  {/* H2H center */}
                  <H2HCenter wins={match.h2h.wins} losses={match.h2h.losses} />

                  {/* West */}
                  <RikishiSide
                    rikishi={match.west}
                    side="west"
                    isWinner={match.result?.winner === "west"}
                    onClick={() => navigate(`/rikishi/${match.west.id}`)}
                  />

                  {/* Result badge */}
                  <div className="shrink-0 ml-1 flex items-center gap-1.5">
                    {hasResult ? (
                      <div className="result-reveal flex items-center gap-1.5">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-mono ${
                            (match.result as any)?.rarity === "legendary" || (match.result as any)?.rarity === "rare"
                              ? "kimarite-rare"
                              : ""
                          }`}
                        >
                          {match.result?.kimariteName ?? "—"}
                        </Badge>
                        <Eye className="h-3.5 w-3.5 text-muted-foreground/60" />
                      </div>
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">
                        <CircleDot className="h-3 w-3 mr-0.5 animate-pulse-glow" />
                        Pending
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Tags row */}
                <BoutTags match={match as any} />

                {/* H2H commentary */}
                {match.h2hCommentary && (match.h2h.wins > 0 || match.h2h.losses > 0) && (
                  <p className="mt-1.5 text-[11px] text-muted-foreground/70 italic line-clamp-1 pl-5">
                    {match.h2hCommentary}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
