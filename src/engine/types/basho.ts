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
  phase: "tachiai" | "clinch" | "momentum" | "finish" | "tactical";
  description: string;
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
  log: BoutLogEntry[];
  narrative?: string[];
}

/** Defines the structure for match schedule. */
export interface MatchSchedule {
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
