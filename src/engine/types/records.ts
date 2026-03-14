/**
 * H2H & Match Record Types
 */

export interface H2HRecord {
  wins: number;
  losses: number;
  lastMatch: {
    winnerId: string;
    kimarite: string;
    bashoId: string;
    day: number;
    year: number;
  } | null;
  streak: number;
}

export interface MatchResultLog {
  opponentId: string;
  win: boolean;
  kimarite: string;
  bashoId: string;
  day: number;
}
