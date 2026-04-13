import type { InjuryType, InjurySeverity, InjuryBodyArea } from "../systems/health/BodyDefinitions";
/**
 * Rikishi Types
 */

import type { Id } from "./common";
import {
  Style,
  CombatArchetype,
  KimariteId,
  CombatProfile,
  RikishiArchetype,
  TacticalArchetype,
} from "./combat";

export type { RikishiArchetype, TacticalArchetype };

import type { Division, Rank, Side } from "./banzuke";
import type { H2HRecord, MatchResultLog } from "./records";
import type { RikishiEconomics } from "./economy";
import type { RikishiBehavior } from "./media";
import type { CareerSnapshot, Milestone } from "./history";

/** Log of tactical success/failure during a basho. */
export type AttributeKey = "power" | "speed" | "balance" | "technique";

export interface ArchetypeEvidence {
  push: { success: number; fail: number };
  grapple: { success: number; fail: number };
  evade: { success: number; fail: number };
}

/** Career achievements and prestige ledger. */
export interface RikishiAchievements {
  kinboshiEarned: number; // Gold Stars (v Yokozuna)
  ginboshiEarned: number; // Silver Stars (v Ozeki)
  kinboshiConceded: number; // For Yokozuna: times beaten by Maegashira
  ginboshiConceded: number; // For Ozeki: times beaten by Maegashira
  specialPrizes: {
    shukunSho: number; // Outstanding Performance
    kantoSho: number; // Fighting Spirit
    ginoSho: number; // Technique
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
  specialPrizes?: RikishiAchievements["specialPrizes"];
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
    type: InjuryType;
    isInjured?: boolean;
    severity: InjurySeverity;
    location?: InjuryBodyArea;
    weeksRemaining: number;
    weeksToHeal?: number;
  };
  isKyujo: boolean; // Separate from injured - voluntary withdrawal
  kyujoReason?: "voluntary" | "injury" | "personal";
  medicalCertificate?: {
    injury: string;
    severity: string;
    treatmentWeeks: number;
    submittedDate: number;
  };

  style: Style;
  trainingFocus?: string;
  combatProfile: CombatProfile;

  /** @deprecated Use combatProfile.archetype. Retained for legacy save compatibility. */
  archetype?: TacticalArchetype;
  /** @deprecated Use combatProfile.archetype for label lookups via ARCHETYPE_NAMES. */
  derivedArchetype?: RikishiArchetype;
  /** @deprecated Use combatProfile.archetype. */
  tacticalArchetypePrimary?: CombatArchetype;
  tacticalArchetypeSecondary?: CombatArchetype;
  archetypeEvidence: ArchetypeEvidence;

  division: Division;
  rank: Rank;
  rankNumber?: number;
  side: Side;

  careerWins: number;
  careerLosses: number;
  careerAbsences: number;
  makuuchiWins: number;
  divisionRecords: {
    makuuchi: { wins: number; losses: number };
    juryo: { wins: number; losses: number };
    makushita: { wins: number; losses: number };
    sandanme: { wins: number; losses: number };
    jonidan: { wins: number; losses: number };
    jonokuchi: { wins: number; losses: number };
  };
  consecutiveYusho: number;
  consecutiveStrongOzeki?: number; // Tracks consecutive 12+ win performances at ozeki for yokozuna promotion
  consecutiveMakeKoshi?: number; // Tracks consecutive losing records (make-koshi) for yokozuna retirement pressure
  consecutiveKyujo?: number; // Tracks consecutive tournaments missed entirely
  councilWarnings?: number; // Number of formal council warnings received (stat debuffs)
  pressureScore?: number; // Internal score tracking sub-par performances for warnings

  careerHistory: CareerSnapshot[];
  milestones: Milestone[];
  shikonaHistory?: Array<{ shikona: string; fromYear: number; toYear?: number }>;

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

  age?: number;
  isPlayer?: boolean;

  // Basho tracking (set by tournament simulation)
  currentBashoWins?: number;
  currentBashoLosses?: number;
  currentBashoRecord?: { wins: number; losses: number };

  // UI hysteresis descriptor (set by tickDaily, consumed by presenters)

  descriptor?: any;

  // Backward-compat alias for injuryStatus (set by RecoveryService)
  injury?: Rikishi["injuryStatus"];

  // Used by InjuryService for durability calculation
  durability?: number;

  // Fan appeal score, bumped by kinboshi/ginboshi upsets
  marketability?: number;
}
