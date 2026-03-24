import type { Rank, Division } from "./banzuke";

/**
 * Immutable snapshot of a Rikishi's performance in a single basho.
 */
export interface CareerSnapshot {
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
}

/**
 * Significant career event.
 */
export interface Milestone {
  id: string;
  type: "promotion" | "yusho" | "special_prize" | "kinboshi" | "stats_record" | "retirement";
  title: string;
  description: string;
  date: { year: number; month: number };
  data?: any;
}

/**
 * Historical record of an Oyakata's tenure leading a stable.
 */
export interface HistoricalOyakata {
  oyakataId: string;
  name: string;
  startYear: number;
  endYear?: number;
  achievements: string[];
}
