/**
 * Division / Rank / Banzuke Types
 */

import type { Id } from "./common";

/** Type representing division. */
export type Division = "makuuchi" | "juryo" | "makushita" | "sandanme" | "jonidan" | "jonokuchi";

/** Type representing rank. */
export type Rank =
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

/** Type representing numbered rank. */
export type NumberedRank = "maegashira" | "juryo" | "makushita" | "sandanme" | "jonidan" | "jonokuchi";
/** Type representing unnumbered rank. */
export type UnnumberedRank = "yokozuna" | "ozeki" | "sekiwake" | "komusubi";

/** Type representing side. */
export type Side = "east" | "west";

/** Type representing rank position. */
export type RankPosition =
  | { rank: UnnumberedRank; side: Side; rankNumber?: never }
  | { rank: NumberedRank; rankNumber: number; side: Side };

/**
 * Is numbered rank.
 *  * @param rank - The Rank.
 *  * @returns The result.
 */
export function isNumberedRank(rank: Rank): rank is NumberedRank {
  return (
    rank === "maegashira" ||
    rank === "juryo" ||
    rank === "makushita" ||
    rank === "sandanme" ||
    rank === "jonidan" ||
    rank === "jonokuchi"
  );
}

/**
 * To rank position.
 *  * @param args - The Args.
 *  * @returns The result.
 */
export function toRankPosition(args: { rank: Rank; side: Side; rankNumber?: number }): RankPosition {
  const { rank, side, rankNumber } = args;
  if (isNumberedRank(rank)) {
    if (!rankNumber || rankNumber < 1) throw new Error(`Rank ${rank} requires rankNumber >= 1`);
    return { rank, side, rankNumber };
  }
  return { rank: rank as UnnumberedRank, side };
}

/** Defines the structure for banzuke assignment. */
export interface BanzukeAssignment {
  rikishiId: Id;
  position: RankPosition;
}

/** Defines the structure for division banzuke snapshot. */
export interface DivisionBanzukeSnapshot {
  division: Division;
  slots: RankPosition[];
  assignments: BanzukeAssignment[];
}

/** Defines the structure for banzuke snapshot. */
export interface BanzukeSnapshot {
  year: number;
  bashoNumber: 1 | 2 | 3 | 4 | 5 | 6;
  divisions: Record<Division, DivisionBanzukeSnapshot>;
}

/** Defines the structure for rikishi basho performance. */
export interface RikishiBashoPerformance {
  rikishiId: Id;
  division: Division;
  priorRank: RankPosition;
  wins: number;
  losses: number;
  absences?: number;
  fusenWins?: number;
  fusenLosses?: number;
  sos?: number;
}
