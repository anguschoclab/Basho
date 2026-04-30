/**
 * boutCardComponents.tsx
 *
 * Helper components for BoutCard.
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TooltipWrap } from "@/components/ui/tooltip-wrap";
import { TrendingUp, AlertTriangle, Users } from "lucide-react";
import type { UIRikishi } from "@/presenters/uiModels";
import { RikishiName } from "@/components/ClickableName";
import type { MatchRowData, HEAT_CONFIG } from "./boutCardTypes.tsx";

export function RikishiSide({
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

export function H2HCenter({ wins, losses }: { wins: number; losses: number }) {
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

export function BoutTags({
  match,
  heatConfig,
}: {
  match: MatchRowData;
  heatConfig: typeof HEAT_CONFIG;
}) {
  const { heatBand, rivalry, h2h, east, west } = match;
  const streak =
    (
      east as UIRikishi & {
        h2h?: Record<string, { wins: number; losses: number; streak?: number }>;
      }
    ).h2h?.[west.id]?.streak ?? 0;

  return (
    <div className="flex items-center gap-1.5 flex-wrap mt-2">
      {heatBand && heatBand !== "cold" && heatConfig[heatBand] && (
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
            className={`text-[10px] gap-1 ${heatConfig[heatBand].classes} border`}
          >
            {heatConfig[heatBand].icon}
            {heatConfig[heatBand].label}
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

export function MatchFooter({
  match,
  heatConfig,
}: {
  match: MatchRowData;
  heatConfig: typeof HEAT_CONFIG;
}) {
  return (
    <>
      <BoutTags match={match} heatConfig={heatConfig} />
      {match.h2hCommentary && (match.h2h.wins > 0 || match.h2h.losses > 0) && (
        <p className="mt-1.5 text-[11px] text-muted-foreground/70 italic line-clamp-1 pl-5">
          {match.h2hCommentary}
        </p>
      )}
    </>
  );
}
