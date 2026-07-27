import type { InjuryType, InjurySeverity, InjuryBodyArea } from "../systems/health/BodyDefinitions";
/**
 * Rikishi Types
 */

import type { Id } from "./common";
import type { AvatarConfig } from "./avatar";
import type { Style, KimariteId, CombatProfile, CombatArchetype } from "./combat";
export type { Style, KimariteId } from "./combat";

import type { RikishiDescriptor } from "../descriptorBands";
import type { Division, Rank, Side } from "./banzuke";
import type { H2HRecord, MatchResultLog } from "./records";
import type { RikishiEconomics } from "./economy";
import type { RikishiBehavior, PressPersona } from "./media";
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
  mochikyukinPoints: number; // Cumulative bonus points for sekitori
}

/** Defines the structure for rikishi stats. */
export interface RikishiStats {
  power: number;
  technique: number;
  speed: number;
  weight: number;
  stamina: number;
  mental: number;
  adaptability: number;
  balance: number;
  aggression: number;
  experience: number;
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
  birthMonth?: number;
  birthDay?: number;
  origin?: string;

  height: number;
  weight: number;

  momentum: number;
  fatigue: number;

  isRetired?: boolean;
  retirementYear?: number;
  retirementReason?: string;

  injured: boolean;
  injuryWeeksRemaining: number;
  injuryStatus?: {
    type: InjuryType;
    isInjured?: boolean;
    severity: InjurySeverity;
    location?: InjuryBodyArea;
    weeksRemaining: number;
    weeksToHeal?: number;
    /** Phase 5: Overtraining & Burnout tracking */
    isEmergentProdigy?: boolean;
    consecutiveExtremeWeeks?: number; // 0-3: leads to burnout crash
  };
  isKyujo: boolean; // Separate from injured - voluntary withdrawal
  kyujoReason?: "voluntary" | "injury" | "personal";
  medicalCertificate?: {
    injury: string;
    severity: string;
    treatmentWeeks: number;
    submittedDate: number;
  };

  /** Phase 5: Overtraining & Burnout tracking */
  consecutiveExtremeWeeks?: number;

  style: Style;
  trainingFocus?: string;
  combatProfile: CombatProfile;

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
  consecutiveKachiKoshi?: number; // Tracks consecutive winning records (kachi-koshi) for narrative
  consecutiveKyujo?: number; // Tracks consecutive tournaments missed entirely
  councilWarnings?: number; // Number of formal council warnings received (stat debuffs)
  pressureScore?: number; // Internal score tracking sub-par performances for warnings

  careerHistory: CareerSnapshot[];
  milestones: Milestone[];
  shikonaHistory?: Array<{ shikona: string; fromYear: number; toYear?: number }>;
  /** Phase 5: Alumni & Legacy tracking */
  heyaHistory: Array<{ heyaId: string; joinWeek: number; leaveWeek?: number }>;
  lineage: {
    ancestralHeyaId?: string;
    generationalTier?: number;
    bloodlineTraitId?: string;
  };

  h2h: Record<string, H2HRecord>;
  history: MatchResultLog[];

  favoredKimarite: KimariteId[];
  weakAgainstStyles: Style[];

  economics?: RikishiEconomics;

  name?: string;
  stats: RikishiStats;
  careerRecord?: { wins: number; losses: number; yusho: number };

  avatarConfig?: AvatarConfig; // NEW: Procedural avatar configuration
  personalityTraits: string[];
  condition: number;
  motivation: number;

  behavior: RikishiBehavior;
  pressPersona?: PressPersona;

  motivationCap?: number;
  motivationCapWeeks?: number;

  talentSeed?: number;

  /**
   * Hidden Potential Ability ceiling + development profile.
   * Set once at generation/recruitment; drives how CA approaches PA with age.
   */
  potential?: {
    stats: RikishiStats;
    heightCm: number;
    weightKg: number;
    /** 0.6–1.5, higher = faster development toward PA */
    developmentSpeed: number;
    /** -4 to +4, shifts attribute peak ages (prodigies peak early, late bloomers late) */
    peakAgeOffset: number;
    /** Max fraction of PA actually reachable (journeymen < 1.0) */
    ceilingFraction: number;
    /** Hidden label for narrative/debug — do not expose in UI directly */
    profile: "prodigy" | "standard" | "late_bloomer" | "journeyman" | "early_peaker";
  };

  // Archival pruning (Phase 5 Depth)
  isPruned?: boolean;
  pruningTier?: 1 | 2 | 3;
  bashoHistory?: unknown[]; // Legacy basho results
  pbpLogs?: unknown[]; // Play-by-play logs
  trainingHistory?: unknown[]; // Training history
  perceptionHistory?: unknown[]; // Perception history
  baseStats?: RikishiStats; // Snapshotted base stats
  currentStats?: RikishiStats; // Snapshotted current stats
  skills?: unknown; // Skill tree

  // Dynamic properties set by subsystems

  age?: number;
  isPlayer?: boolean;

  // Basho tracking (set by tournament simulation)
  currentBashoWins?: number;
  currentBashoLosses?: number;
  currentBashoRecord?: { wins: number; losses: number };
  currentWinStreak?: number;
  currentLossStreak?: number;

  // UI hysteresis descriptor (set by tickDaily, consumed by presenters)
  descriptor?: RikishiDescriptor;

  // Backward-compat alias for injuryStatus (set by RecoveryService)
  injury?: Rikishi["injuryStatus"];

  // Current injury details (set by InjuryService via updateRikishiNestedField)
  currentInjury?: {
    id: string;
    severity: InjurySeverity;
    area: InjuryBodyArea;
    type: InjuryType;
    weeksOut: number;
    weekOccurred: number;
  };

  // Used by InjuryService for durability calculation
  durability?: number;

  // Set when a rikishi returns from injury (cleared after one basho)
  recentlyReturnedFromInjury?: boolean;

  // Fan appeal score, bumped by kinboshi/ginboshi upsets
  marketability?: number;

  // Ceremonial kesho-mawashi (worn by sekitori during dohyo-iri)
  keshoMawashi?: import("./keshoMawashi").KeshoMawashi;

  // Yokozuna ceremonial rope belt (only for yokozuna rank)
  yokozunaTsuna?: import("./keshoMawashi").YokozunaTsuna;

  // Citizenship & Tenure (J1)
  joinedHeyaDate?: string; // ISO year string e.g. "2025"
  citizenshipStatus?: "native" | "foreign" | "naturalized";

  // Body type derived from height/weight ratio — affects physics modifiers
  bodyType?: "tower" | "barrel" | "compact" | "lanky";

  // Generated backstory string for narrative enrichment
  backstory?: string;

  // History of archetype changes over career
  archetypeHistory?: Array<{ archetype: CombatArchetype; year: number }>;

  // Career decline phase for narrative context
  declinePhase?: "pre-peak" | "peak" | "early-decline" | "late-decline" | "twilight";

  // Tracks consecutive 11+ win performances at sekiwake/komusubi for ozeki promotion
  consecutiveStrongSekiwake?: number;
}
