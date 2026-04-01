/**
 * Rikishi Types
 */

import type { Id } from "./common";
import type { Style, CombatArchetype, KimariteId, CombatProfile, BoutTactic } from "./combat";
import type { Division, Rank, Side } from "./banzuke";
import type { H2HRecord, MatchResultLog } from "./records";
import type { RikishiEconomics } from "./economy";
import type { RikishiBehavior } from "./media";
import type { CareerSnapshot, Milestone } from "./history";

/** Log of tactical success/failure during a basho. */
export interface ArchetypeEvidence {
  tactic: BoutTactic;
  success: boolean;
  bashoId: string;
}

/** Career achievements and prestige ledger. */
export interface RikishiAchievements {
  kinboshiEarned: number;    // Gold Stars (v Yokozuna)
  ginboshiEarned: number;    // Silver Stars (v Ozeki)
  kinboshiConceded: number;  // For Yokozuna: times beaten by Maegashira
  ginboshiConceded: number;  // For Ozeki: times beaten by Maegashira
  specialPrizes: {
    shukunSho: number; // Outstanding Performance
    kantoSho: number;  // Fighting Spirit
    ginoSho: number;   // Technique
  };
}

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
  achievements?: RikishiAchievements; // Career milestone record, not a trainable stat
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
  combatProfile: CombatProfile;
  
  archetype: CombatArchetype;
  derivedArchetype: CombatArchetype;

  tacticalArchetypePrimary: CombatArchetype;
  tacticalArchetypeSecondary?: CombatArchetype;
  archetypeEvidence: ArchetypeEvidence[];

  division: Division;
  rank: Rank;
  rankNumber?: number;
  side: Side;

  careerWins: number;
  careerLosses: number;
  careerAbsences: number;
  makuuchiWins: number;
  consecutiveYusho: number;

  careerHistory: CareerSnapshot[];
  milestones: Milestone[];

  h2h: Record<string, H2HRecord>;
  history: MatchResultLog[];

  favoredKimarite: KimariteId[];
  weakAgainstStyles: Style[];

  economics?: RikishiEconomics;

  name?: string;
  stats: RikishiStats;
  careerRecord?: { wins: number; losses: number; yusho: number };

  faceAvatarUrl?: string;
  personalityTraits: string[];
  condition: number;
  motivation: number;

  behavior: RikishiBehavior;

  motivationCap?: number;
  motivationCapWeeks?: number;

  talentSeed?: number;

  // Dynamic properties set by subsystems
  injury?: any;
  age?: number;
  isPlayer?: boolean;
  [key: string]: any;
}
