/**
 * Basho (Tournament) Types
 */

import type { Id } from "./common";
import type { Side, BanzukeSnapshot } from "./banzuke";
import type { KimariteId, Stance } from "./combat";

/** Type representing basho name. */
export type BashoName = "hatsu" | "haru" | "natsu" | "nagoya" | "aki" | "kyushu";
/** Type representing season. */
export type Season = "winter" | "spring" | "summer" | "autumn";

/** Defines the structure for basho info. */
export interface BashoInfo {
  name: BashoName;
  nameJa: string;
  nameEn: string;
  month: number;
  location: string;
  venue: string;
  venueJa: string;
  startDay: number;
  season: Season;
  description: string;
}

/** Defines the structure for bout log entry. */
export interface BoutLogEntry {
  phase: "tachiai" | "clinch" | "momentum" | "finish" | "tactical" | "engagement";
  description?: string;
  data?: Record<string, any>;
}

/** Defines the structure for bout result. */
export interface BoutResult {
  boutId: string;
  winner: Side;
  winnerRikishiId: Id;
  loserRikishiId: Id;
  kimarite: KimariteId;
  kimariteName: string;
  stance: Stance;
  tachiaiWinner: Side;
  duration: number;
  upset: boolean;
  isKinboshi?: boolean;
  awardFact?: 'kinboshi' | 'ginboshi' | null;
  kenshoEnvelopes: number;
  log: BoutLogEntry[];
  narrative?: string[];
  pbpLines?: any[];
  pbp?: string[];
}

/** Defines the structure for match schedule. */
export interface MatchSchedule {
  boutId: string;
  day: number;
  eastRikishiId: Id;
  westRikishiId: Id;
  result?: BoutResult | null;
}

/** Type representing standings table. */
export type StandingsTable = Record<Id, { wins: number; losses: number }>;
/** Type representing standings table runtime. */
export type StandingsTableRuntime = Map<Id, { wins: number; losses: number }>;

/** Defines the structure for basho state. */
export interface BashoState {
  year: number;
  bashoNumber: 1 | 2 | 3 | 4 | 5 | 6;
  bashoName: BashoName;
  day: number;
  matches: MatchSchedule[];
  standings: StandingsTableRuntime;
  isActive: boolean;

  // Legacy compat
  id?: string;
  name?: string;
  schedule?: MatchSchedule[][];
  results?: BoutResult[][];
  currentDay?: number;
}

/** Defines the structure for basho result. */
export interface BashoResult {
  year: number;
  bashoNumber: 1 | 2 | 3 | 4 | 5 | 6;
  bashoName: BashoName;

  yusho: Id;
  junYusho: Id[];

  // Awards
  ginoSho?: Id;
  kantosho?: Id;
  shukunsho?: Id;

  playoffMatches?: MatchSchedule[];

  prizes: {
    yushoAmount: number;
    junYushoAmount: number;
    specialPrizes: number;
  };

  nextBanzuke?: BanzukeSnapshot;
}
/** Type representing banzuke update hook result. */
export interface BanzukeUpdateHookResult {
  promotions: import("./banzuke").PromotionEvent[];
  demotions: import("./banzuke").DemotionEvent[];
}

/** Type representing banzuke update hook. */
export type BanzukeUpdateHook = (args: {
  world: import("./world").WorldState;
  bashoName: BashoName;
  year: number;
  standings: StandingsTableRuntime;
  seed: string;
}) => BanzukeUpdateHookResult;

/** Defines the structure for basho sim result (Auto-Sim style). */
export interface BashoSimResult {
  bashoName: BashoName;
  year: number;
  yushoWinner: { id: Id; shikona: string; wins: number; losses: number };
  junYusho: string[];
  standings: StandingsTableRuntime;
  keyBouts: BoutResult[];
  injuries: string[];
  promotions: import("./banzuke").PromotionEvent[];
  demotions: import("./banzuke").DemotionEvent[];
}
