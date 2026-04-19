/**
 * Talent Pool & Pipeline Types
 */

import type { Id } from "./common";
import type { CombatArchetype, Style, CombatProfile } from "./combat";

/** Type representing talent pool type. */
export type TalentPoolType = "high_school" | "university" | "foreign";

/** Type representing visibility band. */
export type VisibilityBand = "public" | "rumored" | "obscure" | "hidden";

/** Type representing candidate availability state. */
export type CandidateAvailabilityState =
  | "available"
  | "in_talks"
  | "signed"
  | "locked"
  | "withdrawn";

/** Type representing suitor interest band. */
export type SuitorInterestBand = "low" | "medium" | "high" | "all_in";
/** Type representing suitor offer type. */
export type SuitorOfferType = "standard" | "aggressive" | "prestige_pitch" | "covert";

/** Defines the structure for suitor ref. */
export interface SuitorRef {
  heyaId: Id;
  interestBand: SuitorInterestBand;
  offerType: SuitorOfferType;
  deadlineWeek: number;
}

/** Defines the structure for talent candidate. */
export interface TalentCandidate {
  candidateId: Id;
  personId: Id;
  name: string;
  birthYear: number;
  originRegion: string;
  nationality: string;
  visibilityBand: VisibilityBand;
  reputationSeed: number;
  tags: string[];
  combatProfile: CombatProfile;
  availabilityState: CandidateAvailabilityState;
  competingSuitors: SuitorRef[];

  archetype: CombatArchetype;
  style: Style;
  heightPotentialCm: number;
  weightPotentialKg: number;
  talentSeed: number;
  temperament: {
    discipline: number;
    volatility: number;
  };
  isAmateurStar?: boolean;
  isEmergentProdigy?: boolean; // Ultra-rare (1.5%) high-potential recruit

  /** Potential Ability per stat (0–100). Hidden; revealed via scouting. */
  potentialStats?: {
    strength: number;
    speed: number;
    technique: number;
    balance: number;
    stamina: number;
    mental: number;
    adaptability: number;
  };
  /** Hidden development profile — revealed only at deep scouting. */
  developmentProfile?: "prodigy" | "standard" | "late_bloomer" | "journeyman" | "early_peaker";
  developmentSpeed?: number;
  peakAgeOffset?: number;
  ceilingFraction?: number;
}

/** Defines the structure for talent pool state. */
export interface TalentPoolState {
  poolId: Id;
  poolType: TalentPoolType;
  refreshCadence: "weekly" | "monthly" | "basho" | "yearly";
  populationCap: number;
  hiddenReserveCap: number;
  candidatesVisible: Id[];
  candidatesHidden: Id[];
  lastRefreshWeek: number;
  scarcityBand: "plentiful" | "normal" | "tight" | "scarce" | "crisis";
  qualityBand: "low" | "normal" | "high" | "golden_age";
}

/** Defines the structure for talent pool world state. */
export interface TalentPoolWorldState {
  version: "1.0.0";
  lastYearlyRefreshYear: number;
  candidates: Record<Id, TalentCandidate>;
  pools: Record<TalentPoolType, TalentPoolState>;

  playerScouting?: Record<Id, { scoutingLevel: number; lastScoutedWeek: number }>;
}
