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

/** Defines the structure for match result log. */
export interface MatchResultLog {
  opponentId: string;
  win: boolean;
  kimarite: string;
  bashoId: string;
  day: number;
  year: number;
}

export interface RecordEntry {
  rikishiId: string;
  shikona: string;
  value: number;
  achievedDate: { year: number; month: number };
}

export interface WorldRecords {
  allTime: {
    careerWins: RecordEntry[];
    makuuchiWins: RecordEntry[];
    yusho: RecordEntry[];
    consecutiveYusho: RecordEntry[];
    kinboshi: RecordEntry[];
  };
  active: {
    careerWins: RecordEntry[];
    makuuchiWins: RecordEntry[];
    yusho: RecordEntry[];
    consecutiveYusho: RecordEntry[];
    kinboshi: RecordEntry[];
  };
}
