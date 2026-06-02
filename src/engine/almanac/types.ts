import type { BashoName } from "../types/basho";
import type { Division, Rank } from "../types/banzuke";
import type { Id } from "../types/common";

/** Defines the structure for basho performance. */
export interface BashoPerformance {
  year: number;
  bashoNumber: 1 | 2 | 3 | 4 | 5 | 6;
  bashoName: BashoName;
  division: Division;
  rank: Rank;
  rankNumber?: number;
  wins: number;
  losses: number;
  absences: number;
  yusho: boolean;
  junYusho: boolean;
  ginoSho: boolean;
  kantosho: boolean;
  shukunsho: boolean;
  kinboshiCount: number;
}

/** Defines the structure for rikishi career record. */
export interface RikishiCareerRecord {
  rikishiId: Id;
  shikona: string;
  debutYear: number;
  debutBasho: BashoName;

  totalWins: number;
  totalLosses: number;
  totalAbsences: number;

  yushoCount: number;
  junYushoCount: number;
  sanshoCounts: {
    ginoSho: number;
    kantosho: number;
    shukunsho: number;
  };
  kinboshiCount: number;

  highestRank: Rank;
  highestRankNumber?: number;
  highestRankAchievedYear?: number;
  ozekiRunCount: number;
  yokozunaPromotion?: { year: number; bashoName: BashoName };

  bashoHistory: BashoPerformance[];

  currentWinStreak: number;
  longestWinStreak: number;
  currentLossStreak: number;

  isActive: boolean;
  retiredYear?: number;
  retiredBasho?: BashoName;
}

/** Defines the structure for heya record. */
export interface HeyaRecord {
  heyaId: Id;
  name: string;

  totalYusho: number;
  totalJunYusho: number;
  totalSansho: number;

  yokozunaProduced: number;
  ozekiProduced: number;
  sekitoriProduced: number;

  bashoHistory: Array<{
    year: number;
    bashoName: BashoName;
    sekitoriCount: number;
    bestResult: string;
    totalWins: number;
    totalLosses: number;
  }>;

  foundedYear: number;
  founderName?: string;
}

/** Defines the structure for oyakata record. */
export interface OyakataRecord {
  oyakataId: Id;
  name: string;
  formerShikona?: string;

  careerAsRikishi?: {
    highestRank: Rank;
    yushoCount: number;
    retiredYear: number;
  };

  stableMasterSince: number;
  heyaId: Id;
  rikishiTrained: number;
  yokozunaProduced: number;
  ozekiProduced: number;
  yushoDuringTenure: number;
}

/** Defines the structure for almanac snapshot. */
export interface AlmanacSnapshot {
  year: number;
  bashoNumber: 1 | 2 | 3 | 4 | 5 | 6;
  bashoName: BashoName;

  yushoWinner?: {
    rikishiId: Id;
    shikona: string;
    heyaName: string;
    record: string;
  };

  makuuchiSummary: {
    totalBouts: number;
    avgWins: number;
    injuryCount: number;
  };

  promotions: Array<{ rikishiId: Id; shikona: string; newRank: Rank }>;
  demotions: Array<{ rikishiId: Id; shikona: string; newRank: Rank }>;
  retirements: Array<{ rikishiId: Id; shikona: string; reason?: string }>;
}
