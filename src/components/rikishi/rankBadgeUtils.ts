/**
 * rankBadgeUtils.ts
 *
 * Rank display helpers — registry lookup, division classification, and
 * EN/JA rank text formatting for the RankBadge variants.
 */

import {
  RANK_DISPLAY_REGISTRY,
  isSanyakuRank,
  getDivisionOfRank,
} from "@/constants/engine/rankDisplay";

// Rank metadata sourced from RANK_DISPLAY_REGISTRY (canonical)
export function getRankMeta(rank: string) {
  return RANK_DISPLAY_REGISTRY[rank as keyof typeof RANK_DISPLAY_REGISTRY];
}

export function getRankDivision(
  rank: string
): "sanyaku" | "makuuchi" | "juryo" | "makushita" | "lower" {
  if (isSanyakuRank(rank)) return "sanyaku";
  const div = getDivisionOfRank(rank);
  if (div === "makuuchi") return "makuuchi";
  if (div === "juryo") return "juryo";
  if (div === "makushita") return "makushita";
  return "lower";
}

export function formatRankDisplay(
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

export function formatJapanese(rank: string, rankNumber?: number, side?: "east" | "west"): string {
  const meta = getRankMeta(rank);
  if (!meta) return rank;

  const num = rankNumber && rankNumber > 0 ? rankNumber : "";
  const sideChar = side ? (side === "east" ? "東" : "西") : "";

  if (isSanyakuRank(rank)) {
    return `${meta.ja}${sideChar}`;
  }
  return `${meta.ja.charAt(0)}${num}${sideChar}`;
}
