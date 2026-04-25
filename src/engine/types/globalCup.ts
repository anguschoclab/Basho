/**
 * Global Cup Tournament Types
 */

/** Tournament phase progression */
export type GlobalCupPhase =
  | "registration"
  | "quarterfinals"
  | "semifinals"
  | "finale"
  | "complete";

/** Simplified bout result for Global Cup matches (not the full engine BoutResult) */
export interface GlobalCupBoutResult {
  winner: "east" | "west";
  winningKimarite: string;
  duration: number;
}

/** Individual match in the Global Cup bracket */
export interface GlobalCupMatch {
  id: string;
  round: "quarterfinal" | "semifinal" | "final";
  matchNumber: number;
  eastRikishiId: string;
  westRikishiId: string;
  winnerRikishiId?: string;
  result?: GlobalCupBoutResult;
  day: number;
}

/** Participant in the Global Cup tournament */
export interface GlobalCupParticipant {
  rikishiId: string;
  shikona: string;
  rank: string;
  heyaId?: string;
  nationality: string;
  isChallenger: boolean;
  seed: number;
}

/** Global Cup tournament state - stored in WorldState */
export interface GlobalCupState {
  year: number;
  phase: GlobalCupPhase;
  isActive: boolean;
  participants: GlobalCupParticipant[];
  bracket: GlobalCupMatch[];
  championId?: string;
  startedAtWeek: number;
  completedAtWeek?: number;
}

/** Historical entry for past Global Cup tournaments */
export interface GlobalCupHistoryEntry {
  year: number;
  championId: string;
  championName: string;
  championHeya?: string;
  participantCount: number;
  wasPlayerChampion: boolean;
}

/** Projection data for Global Cup UI */
export interface GlobalCupProjection {
  year: number;
  phase: GlobalCupPhase;
  isActive: boolean;
  phaseLabel: string;
  participants: Array<{
    rikishiId: string;
    shikona: string;
    rank: string;
    heyaName: string;
    nationality: string;
    nationalityFlag: string;
    isChallenger: boolean;
    seed: number;
    isChampion: boolean;
  }>;
  bracket: Array<{
    id: string;
    round: string;
    matchNumber: number;
    eastRikishi: { shikona: string; heyaName: string } | null;
    westRikishi: { shikona: string; heyaName: string } | null;
    winnerRikishi: { shikona: string } | null;
    isComplete: boolean;
    day: number;
  }>;
  champion: { shikona: string; heyaName: string } | null;
  history: GlobalCupHistoryEntry[];
}
