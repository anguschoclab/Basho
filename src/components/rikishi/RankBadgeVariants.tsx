/**
 * RankBadgeVariants.tsx
 *
 * The four RankBadge visual variants — compact, roster, pill, full.
 * Styling hierarchy follows NHK broadcast conventions (sanyaku most
 * prominent, lower divisions muted).
 */

import { cn } from "@/lib/utils";
import { TooltipWrap } from "@/components/ui/tooltip-wrap";
import { getRankMeta } from "./rankBadgeUtils";

type Division = "sanyaku" | "makuuchi" | "juryo" | "makushita" | "lower";

interface VariantProps {
  rank: string;
  rankNumber?: number;
  side?: "east" | "west";
  division: Division;
  displayText: string;
  japaneseText: string;
  showJapanese: boolean;
  className?: string;
}

/** Compact variant — minimal badge for tight spaces, tooltip for detail. */
export function CompactRankBadge({
  rank,
  rankNumber,
  side,
  division,
  displayText,
  className,
}: VariantProps) {
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
          division === "lower" && "bg-muted text-muted-foreground text-[10px]",
          className
        )}
      >
        {displayText}
      </span>
    </TooltipWrap>
  );
}

/** Roster variant — for roster cards, emphasizes rank. */
export function RosterRankBadge({
  division,
  rank,
  side,
  displayText,
  className,
}: VariantProps) {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <span
        className={cn(
          "inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-black uppercase tracking-tight font-mono",
          // Sanyaku - gold treatment
          division === "sanyaku" && "bg-gold text-black shadow-xs",
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

/** Pill variant — for profile headers, most prominent. */
export function PillRankBadge({
  rank,
  side,
  division,
  displayText,
  japaneseText,
  showJapanese,
  className,
}: VariantProps) {
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

/** Full variant — default, balanced presentation. */
export function FullRankBadge({
  rank,
  side,
  division,
  displayText,
  className,
}: VariantProps) {
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
