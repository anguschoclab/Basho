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

/** Defines the structure for chronicle record entry. */
export interface ChronicleRecordEntry {
  type: "careerWins" | "makuuchiWins" | "yusho" | "consecutiveYusho" | "kinboshi";
  holder: string;
  value: string;
  brokenOn: string;
}

/** Defines the structure for champion entry. */
export interface ChampionEntry {
  rikishiId: string;
  shikona: string;
  yushoCount: number;
  bestRank: string;
}

/** Defines the structure for rivalry entry. */
export interface RivalryEntry {
  eastId: string;
  westId: string;
  eastName: string;
  westName: string;
  meetingCount: number;
  description: string;
}

/** Defines the structure for chronicle report. */
export interface ChronicleReport {
  topChampions: ChampionEntry[];
  biggestScandals: string[];
  greatestRivalries: RivalryEntry[];
  eraLabels: string[];
  recordsBroken: ChronicleRecordEntry[];
  highlights: string[];
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

