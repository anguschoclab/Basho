import { RANK_HIERARCHY, type Rank, type RankPosition } from "../types/banzuke";


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

/** Format rank into a short string (e.g. M1E). */
export function formatRank(position: RankPosition): string {
  const info = RANK_HIERARCHY[position.rank];
  const side = position.side === "east" ? "E" : "W";
  if (position.rankNumber !== undefined) return `${info.nameJa}${position.rankNumber}${side}`;
  return `${info.nameJa}${side}`;
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
export function isMakeKoshi(wins: number, losses: number, rank: Rank, absences = 0): boolean {
  const requiredLosses = kachiKoshiThreshold(rank);
  return losses + absences >= requiredLosses;
}
