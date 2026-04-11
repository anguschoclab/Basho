/**
 * src/utils/engineUtils.ts
 * 
 * Centralized utility functions for engine-related UI logic.
 * Ensures consistent seed generation, rank sorting, and data formatting.
 */

import { RANK_HIERARCHY } from "@/presenters/uiDigest";

/**
 * Generates a deterministic-friendly seed string.
 * Uses Date.now() for uniqueness but follows a stable prefix pattern.
 * @param prefix - The string prefix for the seed (default: "world")
 */
export function makeDeterministicSeed(prefix = "world"): string {
  const timestamp = Date.now().toString(36);
  return `${prefix}-${timestamp}`;
}

/**
 * Safely truncates a seed for display.
 * @param seed - The raw seed string
 * @param maxLength - Maximum length before ellipsis (default: 14)
 */
export function safeShortSeed(seed: string | undefined | null, maxLength = 14): string {
  if (!seed) return "unknown";
  return seed.length <= maxLength ? seed : `${seed.slice(0, maxLength)}…`;
}

/**
 * Returns a stable sort key for sumo ranks.
 * Uses the canonical tier from RANK_HIERARCHY. Lower tier = Higher rank.
 * @param rank - The rank string (e.g., "yokozuna")
 */
export function safeRankSortKey(rank: any): number {
  const tier = (RANK_HIERARCHY as any)?.[rank]?.tier;
  return Number.isFinite(tier) ? tier : 999;
}

/**
 * Formats Yen currency in "Man" (10,000s) for readability.
 * @param amount - The raw currency amount
 */
export function formatYenToMan(amount: number): string {
  if (amount < 10000) return `¥${amount}`;
  const man = amount / 10000;
  return `${man.toLocaleString("en-US", { maximumFractionDigits: 1 })}万`;
}

/**
 * Stable sort for a list of rikishi based on rank, then side.
 * @param a - Rikishi A
 * @param b - Rikishi B
 */
export function sortRikishiByRank(a: any, b: any): number {
  const ta = safeRankSortKey(a.rank);
  const tb = safeRankSortKey(b.rank);
  if (ta !== tb) return ta - tb;

  const an = typeof a.rankNumber === "number" ? a.rankNumber : 0;
  const bn = typeof b.rankNumber === "number" ? b.rankNumber : 0;
  if (an !== bn) return an - bn;

  if (a.side !== b.side) return a.side === "east" ? -1 : 1;
  return String(a.shikona ?? "").localeCompare(String(b.shikona ?? ""));
}
