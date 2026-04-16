import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TooltipWrap } from "@/components/ui/tooltip-wrap";
import { useNavigate } from "@tanstack/react-router";
import type { UIRikishi } from "@/presenters/uiModels";
import {
  Flame,
  Thermometer,
  Snowflake,
  Star,
  Swords,
  TrendingUp,
  AlertTriangle,
  Eye,
  CircleDot,
  Users,
} from "lucide-react";
import { RikishiName } from "@/components/ClickableName";
import { SumoAvatar } from "@/components/avatar/SumoAvatar";

export type RivalryHeatBand = "cold" | "warm" | "hot" | "inferno";

export interface MatchLike {
  day?: number;
  boutId?: string;
  eastRikishiId: string;
  westRikishiId: string;
  result?: {
    winner: "east" | "west";
    kimariteName?: string;
    kimarite?: string;
    rarity?: string;
    isKinboshi?: boolean;
    upset?: boolean;
  };
}

export interface MatchRowData extends MatchLike {
  east: UIRikishi;
  west: UIRikishi;
  h2h: { wins: number; losses: number };
  rivalry: {
    tone?: string;
    meetings?: number;
  } | null;
  heatBand: RivalryHeatBand | null;
  isPlayerBout: boolean;
  h2hCommentary: string;
}

// eslint-disable-next-line react-refresh/only-export-components
export function getHeatBand(heat: number): RivalryHeatBand {
  if (heat >= 75) return "inferno";
  if (heat >= 50) return "hot";
  if (heat >= 25) return "warm";
  return "cold";
}

export const HEAT_CONFIG: Record<
  string,
  { icon: React.ReactNode; label: string; classes: string }
> = {
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

// eslint-disable-next-line react-refresh/only-export-components
export function getH2HRecord(r1: UIRikishi, r2: UIRikishi) {
  const record = (r1 as UIRikishi & { h2h?: Record<string, { wins: number; losses: number }> })
    .h2h?.[r2.id];
  return record ? { wins: record.wins, losses: record.losses } : { wins: 0, losses: 0 };
}

function RikishiSide({
  rikishi,
  side,
  isWinner,
  onClick,
}: {
  rikishi: UIRikishi;
  side: "east" | "west";
  isWinner: boolean;
  onClick: () => void;
}) {
  const isEast = side === "east";
  return (
    <div className={`flex-1 min-w-0 ${isEast ? "text-right" : "text-left"}`}>
      <Button
        variant="ghost"
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className={`
          font-display text-sm truncate max-w-full h-auto p-0 hover:bg-transparent
          ${isWinner ? "font-bold winner-glow text-success hover:text-success/80" : "text-foreground"}
        `}
      >
        {rikishi.shikona}
      </Button>
      <div
        className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5"
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

function BoutTags({ match }: { match: MatchRowData }) {
  const { heatBand, rivalry, h2h, east, west } = match;
  const streak =
    (
      east as UIRikishi & {
        h2h?: Record<string, { wins: number; losses: number; streak?: number }>;
      }
    ).h2h?.[west.id]?.streak ?? 0;

  return (
    <div className="flex items-center gap-1.5 flex-wrap mt-2">
      {heatBand && heatBand !== "cold" && HEAT_CONFIG[heatBand] && (
        <TooltipWrap
          content={
            <>
              <p className="text-xs max-w-[200px]">
                {rivalry?.tone && (
                  <span className="capitalize">{rivalry.tone.replace("_", " ")}</span>
                )}
                {rivalry && ` · ${rivalry.meetings} meetings`}
              </p>
            </>
          }
          side="bottom"
        >
          <Badge
            variant="outline"
            className={`text-[10px] gap-1 ${HEAT_CONFIG[heatBand].classes} border`}
          >
            {HEAT_CONFIG[heatBand].icon}
            {HEAT_CONFIG[heatBand].label}
          </Badge>
        </TooltipWrap>
      )}

      {h2h.wins === 0 && h2h.losses === 0 && (
        <Badge variant="secondary" className="text-[10px] gap-1">
          <Users className="h-3 w-3" /> First Meeting
        </Badge>
      )}

      {streak >= 3 && (
        <Badge variant="outline" className="text-[10px] text-success border-success/25 gap-1">
          <TrendingUp className="h-3 w-3" />
          <RikishiName id={east.id} name={east.shikona} /> {streak}W streak
        </Badge>
      )}
      {streak <= -3 && (
        <Badge
          variant="outline"
          className="text-[10px] text-destructive border-destructive/25 gap-1"
        >
          <AlertTriangle className="h-3 w-3" />
          <RikishiName id={east.id} name={east.shikona} /> {Math.abs(streak)}L streak
        </Badge>
      )}
    </div>
  );
}

export const BoutCard = React.memo(
  ({
    match,
    idx,
    onBoutClick,
    onTacticChange,
    playerTactics,
  }: {
    match: MatchRowData;
    idx: number;
    onBoutClick?: (match: MatchRowData) => void;
    onTacticChange?: (boutId: string, tactic: string) => void;
    playerTactics?: Record<string, string>;
  }) => {
    const navigate = useNavigate();
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
        <div className="flex items-center gap-2">
          {match.isPlayerBout && (
            <Star className="h-3.5 w-3.5 text-primary shrink-0" fill="currentColor" />
          )}

          <SumoAvatar
            config={match.east.avatarConfig}
            size="sm"
            showHairstyle={match.east.division === "makuuchi" || match.east.division === "juryo"}
            fallback={match.east.shikona}
            expression={match.east.condition < 50 ? "intense" : "neutral"}
          />
          <RikishiSide
            rikishi={match.east}
            side="east"
            isWinner={match.result?.winner === "east"}
            onClick={() =>
              navigate({ to: "/rikishi/$rikishiId", params: { rikishiId: match.east.id } })
            }
          />

          <H2HCenter wins={match.h2h.wins} losses={match.h2h.losses} />

          <RikishiSide
            rikishi={match.west}
            side="west"
            isWinner={match.result?.winner === "west"}
            onClick={() =>
              navigate({ to: "/rikishi/$rikishiId", params: { rikishiId: match.west.id } })
            }
          />
          <SumoAvatar
            config={match.west.avatarConfig}
            size="sm"
            showHairstyle={match.west.division === "makuuchi" || match.west.division === "juryo"}
            fallback={match.west.shikona}
            expression={match.west.condition < 50 ? "intense" : "neutral"}
          />

          <div className="shrink-0 ml-1 flex items-center gap-1.5">
            {hasResult ? (
              <div className="result-reveal flex items-center gap-1.5">
                <Badge
                  variant="outline"
                  className={`text-[10px] font-mono ${
                    match.result?.rarity === "legendary" || match.result?.rarity === "rare"
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

        {match.isPlayerBout && !hasResult && onTacticChange && (
          <div
            className="mt-3 p-3 bg-card border rounded-md shadow-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-2 pb-2 border-b">
              <Swords className="h-4 w-4 text-primary" />
              <h4 className="font-semibold text-sm">Shikiri Prep: Set Tactic</h4>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs mb-3 p-2 bg-muted/30 rounded">
              <div className="text-muted-foreground">Opponent Style:</div>
              <div className="font-medium capitalize">
                {match.east.style} vs {match.west.style}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "STANDARD", label: "Standard", desc: "Balanced" },
                { id: "YOTSU_BELT", label: "Yotsu (Belt)", desc: "Counters Thrust" },
                { id: "OSHI_THRUST", label: "Oshi (Thrust)", desc: "Counters Henka" },
                { id: "HENKA", label: "Henka", desc: "Counters Belt" },
              ].map((t) => {
                const isSelected = (playerTactics?.[match.boutId || ""] || "STANDARD") === t.id;
                return (
                  <Button
                    variant={isSelected ? "secondary" : "outline"}
                    key={t.id}
                    onClick={() => match.boutId && onTacticChange?.(match.boutId, t.id)}
                    className={`h-auto p-2 justify-start flex-col items-start ${isSelected ? "bg-primary/10 border-primary ring-1 ring-primary" : ""}`}
                  >
                    <span className="font-semibold text-xs">{t.label}</span>
                    <span className="text-[10px] text-muted-foreground font-normal">{t.desc}</span>
                  </Button>
                );
              })}
            </div>
            <div className="mt-3 pt-2 text-right">
              <Badge
                variant="outline"
                className="text-xs bg-muted hover:bg-muted/80 cursor-pointer"
                onClick={() => onBoutClick?.(match)}
              >
                Confirm & Sim Bout &rarr;
              </Badge>
            </div>
          </div>
        )}

        <MatchFooter match={match} />
      </div>
    );
  }
);

function MatchFooter({ match }: { match: MatchRowData }) {
  return (
    <>
      <BoutTags match={match} />
      {match.h2hCommentary && (match.h2h.wins > 0 || match.h2h.losses > 0) && (
        <p className="mt-1.5 text-[11px] text-muted-foreground/70 italic line-clamp-1 pl-5">
          {match.h2hCommentary}
        </p>
      )}
    </>
  );
}
