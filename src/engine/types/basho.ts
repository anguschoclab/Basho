/**
 * Basho (Tournament) Types
 */

import type { Id } from "./common";
import type { Side, BanzukeSnapshot } from "./banzuke";
import type { KimariteId, Stance } from "./combat";

export type BashoName = "hatsu" | "haru" | "natsu" | "nagoya" | "aki" | "kyushu";
export type Season = "winter" | "spring" | "summer" | "autumn";

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

export interface BoutLogEntry {
  phase: "tachiai" | "clinch" | "momentum" | "finish";
  description: string;
  data?: Record<string, number | string | boolean | null | undefined>;
}

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

export interface MatchSchedule {
  day: number;
  eastRikishiId: Id;
  westRikishiId: Id;
  result?: BoutResult | null;
}

export type StandingsTable = Record<Id, { wins: number; losses: number }>;
export type StandingsTableRuntime = Map<Id, { wins: number; losses: number }>;

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
