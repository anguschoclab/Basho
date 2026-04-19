/**
 * RankBadge.tsx
 * =============
 * Canonical rank badge using existing CSS rank utility classes.
 * Delegates visual weight to .rank-yokozuna, .rank-ozeki, etc.
 */

import { cn } from "@/lib/utils";

interface RankBadgeProps {
  rank: string;
  rankNumber?: number;
  side?: "east" | "west";
  className?: string;
}

function getRankClass(rank: string): string {
  const r = rank.toLowerCase();
  if (r === "yokozuna") return "rank-yokozuna";
  if (r === "ozeki") return "rank-ozeki";
  if (r === "sekiwake") return "rank-sekiwake";
  if (r === "komusubi") return "rank-komusubi";
  if (r === "maegashira" || r.startsWith("maegashira")) return "rank-maegashira";
  if (r === "juryo") return "rank-juryo";
  if (r === "makushita") return "rank-makushita";
  if (r === "sandanme") return "rank-sandanme";
  if (r === "jonidan") return "rank-jonidan";
  if (r === "jonokuchi") return "rank-jonokuchi";
  return "rank-makushita";
}

export function RankBadge({ rank, rankNumber, side, className }: RankBadgeProps) {
  const rankClass = getRankClass(rank);
  const label =
    rankNumber && rankNumber > 0
      ? `${rank} ${rankNumber}${side ? (side === "east" ? "E" : "W") : ""}`
      : rank;

  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wide",
        rankClass,
        className
      )}
    >
      {label}
    </span>
  );
}
