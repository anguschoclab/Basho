import {
  RANK_HIERARCHY,
  type Rank,
  type RankPosition,
  type BanzukeEntry,
  type BashoPerformance,
} from "../types/banzuke";
import type { WorldState } from "../types/world";
import { getRikishi } from "../queries";

/**
 * Interface representing a candidate in the banzuke assignment sort.
 */
export interface BanzukeCandidate {
  entry: BanzukeEntry;
  oldKey: number;
  desiredKey: number;
  eligibleBestTier: number;
}

/** Compare ranks by tier, number, and side. */
export function compareRanks(a: RankPosition, b: RankPosition): number {
  const aInfo = RANK_HIERARCHY[a.rank];
  const bInfo = RANK_HIERARCHY[b.rank];

  if (aInfo.tier !== bInfo.tier) return aInfo.tier - bInfo.tier;

  const an = a.rankNumber ?? 0;
  const bn = b.rankNumber ?? 0;
  if (an !== bn) return an - bn;

  if (a.side !== b.side) return a.side === "east" ? -1 : 1;

  return 0;
}

/**
 * Professional hierarchical tiebreaker for Banzuke sorting.
 * Used when desiredKey is identical (performance + move distance balance).
 *
 * Rules:
 * 1. Previous Rank Closeness (oldKey): Lower oldKey (already higher rank) wins.
 * 2. Head-to-Head: Lifetime rivalry check.
 * 3. SOS Proxy: Weighted by opponentAvgTier from BashoPerformance.
 * 4. Fallback: Stable result based on ID.
 */
export function resolveBanzukeTie(
  a: BanzukeCandidate,
  b: BanzukeCandidate,
  world: WorldState | null,
  perfById: Map<string, BashoPerformance>
): number {
  // Level 1: Previous Rank Slot Closeness
  // Favor the rikishi who was already ranked higher.
  if (a.oldKey !== b.oldKey) {
    return a.oldKey - b.oldKey;
  }

  // If no world/data, fallback immediately
  if (!world) return a.entry.rikishiId.localeCompare(b.entry.rikishiId);

  const rikishia = getRikishi(world, a.entry.rikishiId);
  const rikishib = getRikishi(world, b.entry.rikishiId);

  // Level 2: Head-to-Head
  if (rikishia && rikishib) {
    const h2hRecord = rikishia.h2h?.[rikishib.id];
    if (h2hRecord) {
      if (h2hRecord.wins > h2hRecord.losses) return -1;
      if (h2hRecord.wins < h2hRecord.losses) return 1;
    }
  }

  // Level 3: Strength of Schedule (SOS) Proxy
  // Higher opponentAvgTier for Maegashira = harder schedule.
  // Note: Tier values are 1-10 (lower is harder). So we want LOWER avg tier.
  const perfa = perfById.get(a.entry.rikishiId);
  const perfb = perfById.get(b.entry.rikishiId);
  if (perfa && perfb) {
    const sosa = perfa.opponentAvgTier ?? 99;
    const sosb = perfb.opponentAvgTier ?? 99;
    if (sosa !== sosb) return sosa - sosb;
  }

  // Level 4: Fallback (Deterministic Stability)
  return a.entry.rikishiId.localeCompare(b.entry.rikishiId);
}

/** Format rank into a short string (e.g. M1E). */
export function formatRank(position: RankPosition): string {
  const info = RANK_HIERARCHY[position.rank];
  const side = position.side === "east" ? "E" : "W";
  if (position.rankNumber !== undefined) return `${info.nameJa}${position.rankNumber}${side}`;
  return `${info.nameJa}${side}`;
}

/** Alias for formatRank for consistency with plan naming */
export function formatRankPosition(position: RankPosition): string {
  return formatRank(position);
}

/** Get full Japanese rank title (e.g. 東前頭1枚目). */
export function getRankTitleJa(position: RankPosition): string {
  const info = RANK_HIERARCHY[position.rank];
  const sideJa = position.side === "east" ? "東" : "西";
  if (position.rankNumber !== undefined) return `${sideJa}${info.nameJa}${position.rankNumber}枚目`;
  return `${sideJa}${info.nameJa}`;
}

/** Get kachi-koshi threshold for a rank. */
export function kachiKoshiThreshold(rank: Rank): number {
  return Math.floor(RANK_HIERARCHY[rank].fightsPerBasho / 2) + 1;
}

/** Check if performance is kachi-koshi. */
export function isKachiKoshi(wins: number, _losses: number, rank: Rank): boolean {
  return wins >= kachiKoshiThreshold(rank);
}

/** Check if performance is make-koshi. */
export function isMakeKoshi(_wins: number, losses: number, rank: Rank, absences = 0): boolean {
  const requiredLosses = kachiKoshiThreshold(rank);
  return losses + absences >= requiredLosses;
}
