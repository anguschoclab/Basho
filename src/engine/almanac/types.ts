import type { BashoName } from "../types/basho";
import type { Division, Rank } from "../types/banzuke";
import type { Id } from "../types/common";
import type { PbpTag, PbpPhase } from "../bout/boutNarrative";

/** Tags that mark a narrative line as almanac-worthy. */
export const NOTABLE_NARRATIVE_TAGS: PbpTag[] = [
  "milestone",
  "career_high",
  "kinboshi",
  "upset",
  "yusho_race",
  "streak",
  "comeback",
  "rivalry",
  "grudge_match",
  "dominant",
  "dynasty",
  "title_stakes",
  "consecutive_kachi",
  "debut",
  "first_win",
  "kachi_koshi",
  "senshuraku",
];

/** Phases that mark a narrative line as almanac-worthy. */
export const NOTABLE_NARRATIVE_PHASES: PbpPhase[] = ["award", "closing", "ceremony"];

/** Lightweight bout reference with key narrative lines. */
export interface NotableBoutEntry {
  boutId: string;
  year: number;
  bashoName: BashoName;
  day: number;
  opponentId: Id;
  opponentShikona: string;
  winner: boolean;
  kimarite: string;
  isKinboshi: boolean;
  isUpset: boolean;
  isYushoRace: boolean;
  excitementScore?: number;
  narrativeLines: string[];
}

/** Narrative highlight entry for the career story timeline. */
export interface NarrativeHighlight {
  year: number;
  bashoName: BashoName;
  type:
    | "milestone"
    | "career_high"
    | "kinboshi"
    | "upset"
    | "streak"
    | "yusho"
    | "promotion"
    | "retirement"
    | "rivalry"
    | "debut"
    | "comeback"
    | "dominant"
    | "dynasty";
  text: string;
  boutId?: string;
}

/** Banzuke movement history entry. */
export interface PromotionHistoryEntry {
  year: number;
  bashoName: BashoName;
  fromRank: string;
  toRank: string;
  kind: "promotion" | "demotion";
  isJump: boolean;
  isSanyaku: boolean;
  isSekitori: boolean;
}

/** Memory caps to prevent unbounded growth. */
export const MAX_NOTABLE_BOUTS = 50;
export const MAX_NARRATIVE_HIGHLIGHTS = 100;
export const MAX_PROMOTION_HISTORY = 30;

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

  notableBouts?: NotableBoutEntry[];
  narrativeHighlights?: NarrativeHighlight[];
  promotionHistory?: PromotionHistoryEntry[];
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
