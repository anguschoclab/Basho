/**
 * Rikishi Types
 */

import type { Id } from "./common";
import type { Style, TacticalArchetype, KimariteId } from "./combat";
import type { Division, Rank, Side } from "./banzuke";
import type { H2HRecord, MatchResultLog } from "./records";
import type { RikishiEconomics } from "./economy";

/** Defines the structure for rikishi stats. */
export interface RikishiStats {
  strength: number;
  technique: number;
  speed: number;
  weight: number;
  stamina: number;
  mental: number;
  adaptability: number;
  balance: number;
}

/** Defines the structure for rikishi. */
export interface Rikishi {
  mentorId?: Id;
  menteeIds?: Id[];
  id: Id;
  shikona: string;
  realName?: string;
  heyaId: Id;
  nationality: string;
  birthYear: number;
  origin?: string;

  height: number;
  weight: number;

  power: number;
  speed: number;
  balance: number;
  technique: number;
  aggression: number;
  experience: number;
  adaptability: number;

  momentum: number;
  stamina: number;
  fatigue: number;

  isRetired?: boolean;

  injured: boolean;
  injuryWeeksRemaining: number;
  injuryStatus?: {
    type: string;
    isInjured?: boolean;
    severity: string | number;
    location?: string;
    weeksRemaining: number;
    weeksToHeal?: number;
  };

  style: Style;
  trainingFocus?: string;
  archetype: TacticalArchetype;

  division: Division;
  rank: Rank;
  rankNumber?: number;
  side: Side;

  careerWins: number;
  careerLosses: number;
  currentBashoWins: number;
  currentBashoLosses: number;

  h2h: Record<string, H2HRecord>;
  history: MatchResultLog[];

  favoredKimarite: KimariteId[];
  weakAgainstStyles: Style[];

  economics?: RikishiEconomics;

  name?: string;
  stats: RikishiStats;
  careerRecord?: { wins: number; losses: number; yusho: number };
  currentBashoRecord?: { wins: number; losses: number };

  faceAvatarUrl?: string;
  personalityTraits: string[];
  condition: number;
  motivation: number;

  talentSeed?: number;

  // Dynamic properties set by subsystems
  injury?: any;
  age?: number;
  isPlayer?: boolean;
  [key: string]: any;
}
