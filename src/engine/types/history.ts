import type { Rank, Division } from "./banzuke";
import type { Id } from "./common";

/**
 * Immutable snapshot of a Rikishi's performance in a single basho.
 */
export interface CareerSnapshot {
  id: string;
  bashoId: string;
  year: number;
  month: number;
  bashoName: string;

  rank: Rank;
  division: Division;
  rankNumber: number;
  side: "east" | "west";

  wins: number;
  losses: number;
  absences: number;

  isYusho: boolean;
  isJunYusho: boolean;
  specialPrizes: {
    shukunsho: boolean;
    kantosho: boolean;
    ginosho: boolean;
  };

  weight: number;
  momentum: number;

  /** Cumulative career earnings (¥) at the moment this snapshot was taken. */
  totalEarningsAtBasho?: number;
}

/**
 * Significant career event.
 */
export interface Milestone {
  id: string;
  type:
    | "promotion"
    | "yusho"
    | "special_prize"
    | "kinboshi"
    | "stats_record"
    | "retirement"
    | "shikona_change"
    | "ozeki_demotion_comeback_yusho";
  title: string;
  description: string;
  date: { year: number; month: number };
}

/** Tenure achievements. */
export interface OyakataAchievements {
  titlesWon: number;
  rekishiProducedCount: number;
  highestStudentRank?: Rank;
  sekitoriCount: number;
  specialAwards?: string[];
}

/**
 * Historical record of an Oyakata's tenure leading a stable.
 */
export interface HistoricalOyakata {
  oyakataId: Id;
  name: string;
  generation: number;
  startYear: number;
  endYear?: number;

  // Tenure Achievements
  achievements: OyakataAchievements;

  notes?: string;
}

/**
 * Per-year aggregate for a retired rikishi's career.
 */
export interface CareerYearAggregate {
  year: number;
  division: Division;
  rank: Rank;
  wins: number;
  losses: number;
  yusho: number;
  junYusho: number;
  sansho: number;
}

/**
 * Compact summary replacing full Rikishi in historicalRikishi after year-end pruning.
 * Contains enough data for retired-rikishi listings, stable/history pages, career summaries,
 * retirement-age metrics, Hall of Fame, and lineage/legacy references without the full
 * Rikishi object's heavy fields (stats, h2h, combatProfile, etc.).
 */
export interface RetiredRikishiSummary {
  id: Id;
  shikona: string;
  birthYear: number;
  heyaId: Id;
  origin?: string;

  // Career totals
  careerWins: number;
  careerLosses: number;
  yushoCount: number;
  junYushoCount: number;
  sanshoCount: number;
  kinboshiCount: number;
  totalEarnings: number;

  // Peak
  peakRank: Rank;
  peakRankYear: number;
  peakDivision: Division;

  // Retirement
  retirementYear: number;
  retirementReason: string;
  isRetired: true;

  // Per-year aggregates
  yearlyAggregates: CareerYearAggregate[];

  // Lineage/legacy
  lineage?: import("./rikishi").Rikishi["lineage"];
  bloodlineTraitId?: string;

  // Marker for type narrowing (distinguish from full Rikishi)
  isSummary: true;
}

/**
 * Historical record of a closed/defunct Heya.
 */
export interface HistoricalHeya {
  id: Id;
  name: string;
  foundationYear: number;
  extinctYear: number;
  lastMasterId: Id;
  lineage: HistoricalOyakata[];
  totalYusho: number;
  ichimon?: string;
  reasonForClosure: "merger" | "bankruptcy" | "scandal" | "retirement";
}
