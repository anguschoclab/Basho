/**
 * RankBadge.tsx
 *
 * Unified rank display component for rikishi cards and profiles.
 * Implements a hierarchical visual system where higher ranks have more
 * prominent styling, following NHK sumo broadcast conventions.
 */

import { cn } from "@/lib/utils";
import { TooltipWrap } from "@/components/ui/tooltip-wrap";
import {
  RANK_DISPLAY_REGISTRY,
  isSanyakuRank,
  getDivisionOfRank,
} from "@/constants/engine/rankDisplay";

export type RankTier =
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
  rank: RankTier | string;
  rankNumber?: number;
  side?: "east" | "west";
  variant?: "pill" | "compact" | "full" | "roster";
  showJapanese?: boolean;
  className?: string;
}

// Rank metadata sourced from RANK_DISPLAY_REGISTRY (canonical)
function getRankMeta(rank: string) {
  return RANK_DISPLAY_REGISTRY[rank as keyof typeof RANK_DISPLAY_REGISTRY];
}

function getDivision(rank: string): "sanyaku" | "makuuchi" | "juryo" | "makushita" | "lower" {
  if (isSanyakuRank(rank)) return "sanyaku";
  const div = getDivisionOfRank(rank);
  if (div === "makuuchi") return "makuuchi";
  if (div === "juryo") return "juryo";
  if (div === "makushita") return "makushita";
  return "lower";
}

function formatRankDisplay(
  rank: string,
  rankNumber?: number,
  side?: "east" | "west",
  variant: "pill" | "compact" | "full" | "roster" = "full"
): string {
  const meta = getRankMeta(rank);
  if (!meta) return rank;

  const num = rankNumber && rankNumber > 0 ? rankNumber : "";
  const sideChar = side ? (side === "east" ? "E" : "W") : "";

  if (variant === "compact") {
    return `${meta.abbr}${num}${sideChar}`;
  }

  if (variant === "roster") {
    return `${meta.abbr}${num}`;
  }

  // full or pill
  const hasNumber = num !== "" && !isSanyakuRank(rank);
  const base = hasNumber ? `${meta.en} #${num}` : meta.en;
  return side ? `${base} ${sideChar}` : base;
}

function formatJapanese(rank: string, rankNumber?: number, side?: "east" | "west"): string {
  const meta = getRankMeta(rank);
  if (!meta) return rank;

  const num = rankNumber && rankNumber > 0 ? rankNumber : "";
  const sideChar = side ? (side === "east" ? "東" : "西") : "";

  if (isSanyakuRank(rank)) {
    return `${meta.ja}${sideChar}`;
  }
  return `${meta.ja.charAt(0)}${num}${sideChar}`;
}

export function RankBadge({
  rank,
  rankNumber,
  side,
  variant = "full",
  showJapanese = false,
  className,
}: RankBadgeProps) {
  const division = getDivision(rank);
  const displayText = formatRankDisplay(rank, rankNumber, side, variant);
  const japaneseText = showJapanese ? formatJapanese(rank, rankNumber, side) : "";

  // Compact variant - minimal badge for tight spaces
  if (variant === "compact") {
    return (
      <TooltipWrap
        content={`${getRankMeta(rank)?.en || rank} ${rankNumber ? `#${rankNumber}` : ""} ${side ? (side === "east" ? "East" : "West") : ""}`}
        side="top"
      >
        <span
          className={cn(
            "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-tight cursor-help",
            // Sanyaku - prominent
            division === "sanyaku" && "bg-gold text-black",
            division === "sanyaku" && rank === "ozeki" && "bg-silver text-black",
            division === "sanyaku" &&
              (rank === "sekiwake" || rank === "komusubi") &&
              "bg-bronze text-white",
            // Makuuchi - distinct
            division === "makuuchi" && "bg-primary/20 text-primary border border-primary/30",
            // Juryo - visible
            division === "juryo" && "bg-west/20 text-west border border-west/30",
            // Makushita - muted but clear
            division === "makushita" &&
              "bg-secondary text-secondary-foreground border border-border",
            // Lower divisions - subtle
            division === "lower" && "bg-muted text-muted-foreground text-[9px]",
            className
          )}
        >
          {displayText}
        </span>
      </TooltipWrap>
    );
  }

  // Roster variant - for roster cards, emphasizes rank
  if (variant === "roster") {
    return (
      <div className={cn("flex items-center gap-1.5", className)}>
        <span
          className={cn(
            "inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-black uppercase tracking-tight font-mono",
            // Sanyaku - gold treatment
            division === "sanyaku" && "bg-gold text-black shadow-sm",
            division === "sanyaku" && rank === "ozeki" && "bg-silver text-black",
            division === "sanyaku" &&
              (rank === "sekiwake" || rank === "komusubi") &&
              "bg-bronze text-white",
            // Makuuchi - primary color
            division === "makuuchi" && "bg-primary/15 text-primary border border-primary/25",
            // Juryo - west blue
            division === "juryo" && "bg-west/15 text-west border border-west/25",
            // Makushita - neutral
            division === "makushita" &&
              "bg-secondary/80 text-secondary-foreground border border-border/60",
            // Lower divisions - muted
            division === "lower" && "bg-muted text-muted-foreground text-[10px]",
            className
          )}
        >
          {displayText}
        </span>
        {side && (
          <span
            className={cn("text-[10px] font-black", side === "east" ? "text-east" : "text-west")}
          >
            {side === "east" ? "東" : "西"}
          </span>
        )}
      </div>
    );
  }

  // Pill variant - for profile headers, most prominent
  if (variant === "pill") {
    return (
      <div className={cn("flex flex-col items-start gap-1", className)}>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider",
              // Sanyaku - premium styling
              division === "sanyaku" && "rank-shimmer text-black",
              division === "sanyaku" && rank === "yokozuna" && "bg-gold",
              division === "sanyaku" && rank === "ozeki" && "bg-silver",
              division === "sanyaku" &&
                (rank === "sekiwake" || rank === "komusubi") &&
                "bg-bronze text-white",
              // Makuuchi
              division === "makuuchi" && "bg-primary text-primary-foreground",
              // Juryo
              division === "juryo" && "bg-west text-white",
              // Makushita
              division === "makushita" && "bg-secondary border border-border text-foreground",
              // Lower divisions
              division === "lower" && "bg-muted text-muted-foreground text-[10px]",
              className
            )}
          >
            {displayText}
          </span>
          {side && (
            <span
              className={cn(
                "inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-black",
                side === "east" ? "bg-east text-white" : "bg-west text-white"
              )}
            >
              {side === "east" ? "東" : "西"}
            </span>
          )}
        </div>
        {showJapanese && (
          <span className="text-[11px] text-muted-foreground font-medium tracking-wide pl-1">
            {japaneseText}
          </span>
        )}
      </div>
    );
  }

  // Full variant - default, balanced presentation
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span
        className={cn(
          "inline-flex items-center px-2.5 py-1 rounded-md text-xs font-black uppercase tracking-wide",
          // Sanyaku
          division === "sanyaku" && "rank-shimmer text-black",
          division === "sanyaku" && rank === "yokozuna" && "bg-gold",
          division === "sanyaku" && rank === "ozeki" && "bg-silver",
          division === "sanyaku" &&
            (rank === "sekiwake" || rank === "komusubi") &&
            "bg-bronze text-white",
          // Makuuchi
          division === "makuuchi" && "bg-primary/20 text-primary border border-primary/40",
          // Juryo
          division === "juryo" && "bg-west/20 text-west border border-west/40",
          // Makushita
          division === "makushita" && "bg-secondary text-secondary-foreground border border-border",
          // Lower divisions
          division === "lower" && "bg-muted text-muted-foreground",
          className
        )}
      >
        {displayText}
      </span>
      {side && (
        <span
          className={cn(
            "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-black",
            side === "east"
              ? "bg-east/15 text-east border border-east/30"
              : "bg-west/15 text-west border border-west/30"
          )}
        >
          {side === "east" ? "東 E" : "西 W"}
        </span>
      )}
    </div>
  );
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
