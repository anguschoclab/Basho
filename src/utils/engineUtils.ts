/**
 * src/utils/engineUtils.ts
 *
 * Centralized utility functions for engine-related UI logic.
 * Ensures consistent seed generation, rank sorting, and data formatting.
 */

import { RANK_HIERARCHY } from "@/presenters/uiDigest";
import type { Rank } from "@/engine/types/banzuke";
import type { Side } from "@/engine/types/index";

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
export function safeRankSortKey(rank: Rank | string): number {
  const tier = (RANK_HIERARCHY as Record<string, { tier: number }>)[rank]?.tier;
  return Number.isFinite(tier) ? tier : 999;
}

/**
 * Formats a full Yen amount with locale separators.
 * @param amount - The raw currency amount
 * @returns Formatted string (e.g., "¥1,234,567")
 */
export function formatYen(amount: number): string {
  return `¥${amount.toLocaleString()}`;
}

/**
 * Formats Yen currency in "Man" (10,000s) for readability.
 * @param amount - The raw currency amount
 */
export function formatYenToMan(amount: number): string {
  if (Math.abs(amount) < 10000) return `¥${amount}`;
  const man = amount / 10000;
  return `${man.toLocaleString("en-US", { maximumFractionDigits: 1 })}万`;
}

/**
 * Minimal interface representing a rikishi for ranking-based sorting.
 */
interface RikishiForSort {
  /** The rikishi's rank. */
  rank: Rank | string;
  /** The rank number (e.g., Maegashira 1). */
  rankNumber?: number;
  /** The side of the banzuke (East or West). */
  side?: Side;
  /** The rikishi's professional name. */
  shikona?: string;
}

/**
 * Stable sort for a list of rikishi based on rank, then side.
 * @param a - Rikishi A
 * @param b - Rikishi B
 */
export function sortRikishiByRank(a: RikishiForSort, b: RikishiForSort): number {
  const ta = safeRankSortKey(a.rank);
  const tb = safeRankSortKey(b.rank);
  if (ta !== tb) return ta - tb;

  const an = typeof a.rankNumber === "number" ? a.rankNumber : 0;
  const bn = typeof b.rankNumber === "number" ? b.rankNumber : 0;
  if (an !== bn) return an - bn;

  if (a.side !== b.side) return a.side === "east" ? -1 : 1;
  return String(a.shikona ?? "").localeCompare(String(b.shikona ?? ""));
}
