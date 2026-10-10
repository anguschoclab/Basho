/**
 * RankBadge.tsx
 *
 * Unified rank display component for rikishi cards and profiles.
 * Implements a hierarchical visual system where higher ranks have more
 * prominent styling, following NHK sumo broadcast conventions.
 */

import { cn } from "@/lib/utils";
import { getRankMeta, getRankDivision, formatRankDisplay, formatJapanese } from "./rankBadgeUtils";
import {
  CompactRankBadge,
  RosterRankBadge,
  PillRankBadge,
  FullRankBadge,
} from "./RankBadgeVariants";

export type RankBadgeTier =
  | "yokozuna"
  | "ozeki"
  | "sekiwake"
  | "komusubi"
  | "maegashira"
  | "juryo"
  | "makushita"
  | "sandanme"
  | "jonidan"
  | "jonokuchi";

interface RankBadgeProps {
  rank: RankBadgeTier | string;
  rankNumber?: number;
  side?: "east" | "west";
  variant?: "pill" | "compact" | "full" | "roster";
  showJapanese?: boolean;
  className?: string;
}

/**
 * bout result display.
 *  * @param { rank, rankNumber, side, variant, showJapanese, className } - Props.
 */
export function RankBadge({
  rank,
  rankNumber,
  side,
  variant = "full",
  showJapanese = false,
  className,
}: RankBadgeProps) {
  const division = getRankDivision(rank);
  const displayText = formatRankDisplay(rank, rankNumber, side, variant);
  const japaneseText = showJapanese ? formatJapanese(rank, rankNumber, side) : "";

  const shared = {
    rank,
    rankNumber,
    side,
    division,
    displayText,
    japaneseText,
    showJapanese,
    className,
  };

  if (variant === "compact") return <CompactRankBadge {...shared} />;
  if (variant === "roster") return <RosterRankBadge {...shared} />;
  if (variant === "pill") return <PillRankBadge {...shared} />;
  return <FullRankBadge {...shared} />;
}

// Simple inline rank display for tables/lists
export function RankInline({
  rank,
  rankNumber,
  side,
  className,
}: Omit<RankBadgeProps, "variant" | "showJapanese">) {
  const meta = getRankMeta(rank);
  const num = rankNumber && rankNumber > 0 ? rankNumber : "";
  const display = meta ? `${meta.abbr}${num}` : rank;

  return (
    <span className={cn("inline-flex items-center gap-1 font-mono text-xs", className)}>
      <span
        className={cn(
          "font-black",
          rank === "yokozuna" && "text-gold",
          rank === "ozeki" && "text-silver",
          (rank === "sekiwake" || rank === "komusubi") && "text-bronze",
          rank === "maegashira" && "text-primary",
          rank === "juryo" && "text-west",
          (rank === "makushita" ||
            rank === "sandanme" ||
            rank === "jonidan" ||
            rank === "jonokuchi") &&
            "text-muted-foreground"
        )}
      >
        {display}
      </span>
      {side && (
        <span className={cn("text-[10px]", side === "east" ? "text-east" : "text-west")}>
          {side === "east" ? "東" : "西"}
        </span>
      )}
    </span>
  );
}
