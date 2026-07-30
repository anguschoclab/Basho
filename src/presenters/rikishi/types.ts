/**
 * Rikishi DTO Types
 * =================
 * Decomposed UIRikishi interface following SRP.
 * Each DTO represents a distinct domain of rikishi data.
 */

import type { Id } from "../../engine/types/common";
import type { Rank, Division, Side } from "../../engine/types/banzuke";
import type { Style, CombatArchetype } from "../../engine/types/combat";
import type { RikishiDescriptor, PotentialBand } from "../../engine/descriptorBands";
import type { SalaryBreakdown } from "../../engine/economics_awards";
import type { AvatarConfig } from "../../engine/types/avatar";
import type { KeshoMawashi, YokozunaTsuna } from "../../engine/types/keshoMawashi";
import type {
  AgeBand,
  WeightBand,
  HeightBand,
} from "../../engine/systems/narrative/NarrativeBands";

// ============================================================================
// Core DTOs
// ============================================================================

/** Identity fields - who the rikishi is */
export interface RikishiIdentityDTO {
  id: Id;
  shikona: string;
  realName: string;
  heyaId: Id;
  heyaName: string;
  isPlayerOwned: boolean;
  age: number;
  nationality: string;
  origin: string;
  height: number;
  weight: number;
}

/** Rank and division information */
export interface RikishiRankDTO {
  rank: Rank;
  rankLabel: string;
  rankLabelJa: string;
  rankNumber: number;
  division: Division;
  side: Side;
  isYokozuna: boolean;
}

/** Combat style and archetype */
export interface RikishiStyleDTO {
  style: Style;
  styleName: string;
  archetypeName: string;
  combatArchetype?: CombatArchetype;
  preferredGrip: string;
  preferredGripDepth: string;
}

/** Current condition and status */
export interface RikishiStatusDTO {
  isRetired: boolean;
  isInjured: boolean;
  injurySummary: string;
  condition: number;
  motivation: number;
  fatigue: number;
  councilWarnings: number;
}

/** Performance bands (power, technique, etc.) */
export interface RikishiBandsDTO {
  powerBand: string;
  techniqueBand: string;
  speedBand: string;
  balanceBand: string;
  momentum: number;
  careerPhase: string;
  ageBand: AgeBand;
  weightBand: WeightBand;
  heightBand: HeightBand;
}

/** Career statistics */
export interface RikishiCareerDTO {
  currentBashoWins: number;
  currentBashoLosses: number;
  currentBashoRecord: string;
  careerWins: number;
  careerLosses: number;
  careerAbsences: number;
  careerRecord: string;
  careerYusho: number;
  streak: number;
  streakLabel: string;
  winPercentage: number;
  avgRankLabel: string;
}

/** Perceived stat labels (UI display) */
export interface RikishiPerceivedStatsDTO {
  strength: string;
  technique: string;
  speed: string;
  stamina: string;
  mental: string;
  adaptability: string;
  balance: string;
}

/** Descriptors and potential */
export interface RikishiDescriptorDTO {
  descriptor: RikishiDescriptor;
  potentialBand: PotentialBand;
  conditionDescriptor: string;
  moraleDescriptor: string;
  potentialDescriptor: string;
  ageDescriptor: string;
  weightDescriptor: string;
  heightDescriptor: string;
}

/** Top rival information */
export interface UIRivalEntry {
  opponentId: string;
  opponentShikona: string;
  wins: number;
  losses: number;
  record: string;
  totalBouts: number;
  heat: number;
  tone: string;
}

/** Rivals data */
export interface RikishiRivalsDTO {
  topRivals: UIRivalEntry[];
}

/** Kimarite (winning technique) preferences */
export interface RikishiKimariteDTO {
  favoredKimarite: string[];
  favoredKimariteDetailed: { kimarite: string; percentage: number }[];
  favoredKimariteDisplay: string;
}

/** Personality and traits */
export interface RikishiPersonalityDTO {
  personalityTraits: string[];
}

/** Special prizes and achievements */
export interface RikishiAchievementsDTO {
  specialPrizes: {
    shukunSho: number;
    kantoSho: number;
    ginoSho: number;
  };
  achievements: {
    kinboshiEarned: number;
    ginboshiEarned: number;
    kinboshiConceded: number;
    ginboshiConceded: number;
    mochikyukinPoints: number;
  };
}

/** Salary and financial */
export interface RikishiEconomicsDTO {
  salaryBreakdown: SalaryBreakdown;
}

/** Kesho-mawashi and visual customization */
export interface RikishiVisualDTO {
  avatarConfig?: AvatarConfig;
  keshoMawashi?: KeshoMawashi;
  yokozunaTsuna?: YokozunaTsuna;
  hasKeshoMawashi: boolean;
}

/** Citizenship and career data */
export interface RikishiCareerDataDTO {
  careerHistory: unknown[];
  milestones: unknown[];
  citizenshipStatus: string;
  yearsToNaturalization: number;
  consecutiveStrongOzeki: number;
  consecutiveStrongSekiwake: number;
  consecutiveMakeKoshi?: number;
  consecutiveKyujo?: number;
  weightJourney?: {
    targetKg: number;
    progressKg: number;
    stalled: boolean;
    phases: string[];
  };
  oversleptBasho?: { bashoName: string; day: number; year: number } | null;
}

/** Lineage (mentor/mentee relationships) */
export interface RikishiLineageDTO {
  mentorId?: Id;
  mentorName?: string;
  menteeNames?: string[];
}

/** Head-to-head records */
export interface RikishiH2HDTO {
  h2h?: Record<string, { wins: number; losses: number; streak: number }>;
}

// ============================================================================
// Composite DTO
// ============================================================================

/** Complete rikishi DTO - composed of all smaller DTOs */
export interface UIRikishiDTO
  extends
    RikishiIdentityDTO,
    RikishiRankDTO,
    RikishiStyleDTO,
    RikishiStatusDTO,
    RikishiBandsDTO,
    RikishiCareerDTO,
    RikishiDescriptorDTO,
    RikishiRivalsDTO,
    RikishiKimariteDTO,
    RikishiPersonalityDTO,
    RikishiAchievementsDTO,
    RikishiEconomicsDTO,
    RikishiVisualDTO,
    RikishiCareerDataDTO,
    RikishiLineageDTO,
    RikishiH2HDTO {
  perceivedStats: RikishiPerceivedStatsDTO;
}

// ============================================================================
// Legacy Compatibility
// ============================================================================

/** Type alias for UIRikishiDTO for backward compatibility. */
export type UIRikishi = UIRikishiDTO;

/** Rank delta for roster entries */
export interface UIRankDelta {
  type: "new" | "unchanged" | "up" | "down";
  steps: number;
}

/** Roster entry (lighter projection for banzuke/roster views) */
export interface UIRosterEntry {
  id: Id;
  shikona: string;
  heyaId: Id;
  isPlayerOwned: boolean;
  rank: Rank;
  rankLabel: string;
  rankLabelJa: string;
  rankNumber?: number;
  division: Division;
  side: Side;
  record: string;
  careerRecord: string;
  currentBashoWins: number;
  currentBashoLosses: number;
  careerWins: number;
  careerLosses: number;
  careerAbsences: number;
  isInjured: boolean;
  condition: number;
  fatigue: number;
  powerBand: string;
  techniqueBand: string;
  speedBand: string;
  balanceBand: string;
  momentum: number;
  potentialBand: PotentialBand;
  keshoMawashi?: KeshoMawashi;
  avatarConfig?: AvatarConfig;
  rankDelta?: UIRankDelta;
  archetypeLabel?: string;
  consecutiveStrongOzeki: number;
  consecutiveStrongSekiwake: number;
  consecutiveMakeKoshi?: number;
  consecutiveKyujo?: number;
  councilWarnings: number;
  streakLabel: string;
  winPercentage: number;
  citizenshipStatus: string;
  yearsToNaturalization: number;
  weightJourney?: {
    targetKg: number;
    progressKg: number;
    stalled: boolean;
    phases: string[];
  };
  oversleptBasho?: { bashoName: string; day: number; year: number } | null;
}
