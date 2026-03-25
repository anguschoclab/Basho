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
function isNumberedRank(rank: Rank): rank is NumberedRank {
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
interface RikishiBashoPerformance {
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
/** Defines the structure for rank info. */
export interface RankInfo {
  rank: Rank;
  division: Division;
  nameJa: string;
  tier: number; // Lower = higher rank (1 = yokozuna)
  salary: number;
  isSanyaku: boolean;
  isSekitori: boolean;
  fightsPerBasho: number;
}

/** r a n k_ h i e r a r c h y. */
export const RANK_HIERARCHY: Record<Rank, RankInfo> = {
  yokozuna: {
    rank: "yokozuna",
    division: "makuuchi",
    nameJa: "横綱",
    tier: 1,
    salary: 3_000_000,
    isSanyaku: true,
    isSekitori: true,
    fightsPerBasho: 15
  },
  ozeki: {
    rank: "ozeki",
    division: "makuuchi",
    nameJa: "大関",
    tier: 2,
    salary: 2_500_000,
    isSanyaku: true,
    isSekitori: true,
    fightsPerBasho: 15
  },
  sekiwake: {
    rank: "sekiwake",
    division: "makuuchi",
    nameJa: "関脇",
    tier: 3,
    salary: 1_800_000,
    isSanyaku: true,
    isSekitori: true,
    fightsPerBasho: 15
  },
  komusubi: {
    rank: "komusubi",
    division: "makuuchi",
    nameJa: "小結",
    tier: 4,
    salary: 1_800_000,
    isSanyaku: true,
    isSekitori: true,
    fightsPerBasho: 15
  },
  maegashira: {
    rank: "maegashira",
    division: "makuuchi",
    nameJa: "前頭",
    tier: 5,
    salary: 1_400_000,
    isSanyaku: false,
    isSekitori: true,
    fightsPerBasho: 15
  },
  juryo: {
    rank: "juryo",
    division: "juryo",
    nameJa: "十両",
    tier: 6,
    salary: 1_100_000,
    isSanyaku: false,
    isSekitori: true,
    fightsPerBasho: 15
  },
  makushita: {
    rank: "makushita",
    division: "makushita",
    nameJa: "幕下",
    tier: 7,
    salary: 0,
    isSanyaku: false,
    isSekitori: false,
    fightsPerBasho: 7
  },
  sandanme: {
    rank: "sandanme",
    division: "sandanme",
    nameJa: "三段目",
    tier: 8,
    salary: 0,
    isSanyaku: false,
    isSekitori: false,
    fightsPerBasho: 7
  },
  jonidan: {
    rank: "jonidan",
    division: "jonidan",
    nameJa: "序二段",
    tier: 9,
    salary: 0,
    isSanyaku: false,
    isSekitori: false,
    fightsPerBasho: 7
  },
  jonokuchi: {
    rank: "jonokuchi",
    division: "jonokuchi",
    nameJa: "序ノ口",
    tier: 10,
    salary: 0,
    isSanyaku: false,
    isSekitori: false,
    fightsPerBasho: 7
  }
};

/** Defines the structure for banzuke entry. */
export interface BanzukeEntry {
  rikishiId: string;
  position: RankPosition;
  division: Division;
}

/** Defines the structure for basho performance. */
export interface BashoPerformance {
  rikishiId: string;
  wins: number;
  losses: number;
  absences?: number;
  yusho?: boolean;
  junYusho?: boolean;
  specialPrizes?: number;
  kinboshi?: number;
  opponentAvgTier?: number;
  promoteToYokozuna?: boolean;
}

/** Defines the structure for movement event. */
export interface MovementEvent {
  rikishiId: string;
  from: string;
  to: string;
  description: string;
  kind: "promotion" | "demotion" | "lateral" | "status";
}
