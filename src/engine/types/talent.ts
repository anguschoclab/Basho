/**
 * src/engine/types/talent.ts
 * ========================
 * Talent Pool & Pipeline Types
 *
 * Defines types for the talent pool system that manages recruitment candidates.
 * These types are used throughout the recruitment and scouting systems.
 *
 * @see FogOfWarService for scouting bias and visibility
 * @see TalentPoolScouting for candidate generation
 */

import type { Id } from "./common";
import type { CombatArchetype, Style, CombatProfile } from "./combat";
import type { ScoutingBias } from "../systems/recruitment/FogOfWarService";

/**
 * Type representing talent pool type.
 * Different sources of recruitment candidates.
 */
export type TalentPoolType = "high_school" | "university" | "foreign";

/**
 * Type representing visibility band.
 * Determines how much information is available about a candidate.
 */
export type VisibilityBand = "public" | "rumored" | "obscure" | "hidden";

/**
 * Type representing candidate availability state.
 * Current status of a candidate in the recruitment pipeline.
 */
export type CandidateAvailabilityState =
  | "available" // Available for recruitment
  | "in_talks" // In negotiations with a heya
  | "signed" // Signed to a heya
  | "locked" // Locked (cannot be recruited)
  | "withdrawn"; // Withdrawn from consideration

/**
 * Type representing suitor interest band.
 * Level of interest from a competing heya.
 */
export type SuitorInterestBand = "low" | "medium" | "high" | "all_in";

/**
 * Type representing suitor offer type.
 * Type of recruitment offer made by a competing heya.
 */
export type SuitorOfferType = "standard" | "aggressive" | "prestige_pitch" | "covert";

/**
 * Defines the structure for suitor ref.
 * Represents a competing heya's interest in a candidate.
 */
export interface SuitorRef {
  /** ID of the suitor heya. */
  heyaId: Id;
  /** Interest band level. */
  interestBand: SuitorInterestBand;
  /** Type of offer made. */
  offerType: SuitorOfferType;
  /** Deadline week for the offer. */
  deadlineWeek: number;
}

/**
 * Defines the structure for talent candidate.
 * Represents a recruit in the talent pool.
 */
export interface TalentCandidate {
  /** Unique candidate identifier. */
  candidateId: Id;
  /** Person identifier. */
  personId: Id;
  /** Full name of the candidate. */
  name: string;
  /** Birth year. */
  birthYear: number;
  /** Region of origin. */
  originRegion: string;
  /** Nationality. */
  nationality: string;
  /** Visibility band (how much info is available). */
  visibilityBand: VisibilityBand;
  /** Reputation seed for random generation. */
  reputationSeed: number;
  /** Tags for categorization. */
  tags: string[];
  /** Combat profile (visible stats). */
  combatProfile: CombatProfile;
  /** Current availability state. */
  availabilityState: CandidateAvailabilityState;
  /** Array of competing suitors. */
  competingSuitors: SuitorRef[];

  /** Combat archetype. */
  archetype: CombatArchetype;
  /** Combat style. */
  style: Style;
  /** Potential height in cm. */
  heightPotentialCm: number;
  /** Potential weight in kg. */
  weightPotentialKg: number;
  /** Talent seed for random generation. */
  talentSeed: number;
  /** Temperament stats. */
  temperament: {
    discipline: number;
    volatility: number;
  };
  /** Whether this candidate is an amateur star. */
  isAmateurStar?: boolean;
  /** Whether this candidate is an ultra-rare emergent prodigy (1.5% chance). */
  isEmergentProdigy?: boolean;

  /**
   * Potential Ability per stat (0–100).
   * Hidden; revealed via scouting.
   */
  potentialStats?: {
    strength: number;
    speed: number;
    technique: number;
    balance: number;
    stamina: number;
    mental: number;
    adaptability: number;
  };
  /**
   * Hidden development profile — revealed only at deep scouting.
   */
  developmentProfile?: "prodigy" | "standard" | "late_bloomer" | "journeyman" | "early_peaker";
  /** Development speed multiplier. */
  developmentSpeed?: number;
  /** Offset from standard peak age. */
  peakAgeOffset?: number;
  /** Fraction of potential ceiling reachable. */
  ceilingFraction?: number;
  /** Optional bloodline trait if inherited. */
  bloodlineTrait?: import("./dynasty").BloodlineTrait;
  /**
   * Persistent scouting bias that skews initial stat readings.
   * Bias is generated deterministically at candidate creation and decays
   * as scouting observations accumulate, eventually revealing true values.
   */
  scoutingBias?: ScoutingBias;
}

/**
 * Defines the structure for talent pool state.
 * Represents a single talent pool (e.g., high school, university, foreign).
 */
export interface TalentPoolState {
  /** Pool identifier. */
  poolId: Id;
  /** Type of pool. */
  poolType: TalentPoolType;
  /** How often this pool refreshes. */
  refreshCadence: "weekly" | "monthly" | "basho" | "yearly";
  /** Maximum number of visible candidates. */
  populationCap: number;
  /** Maximum number of hidden reserve candidates. */
  hiddenReserveCap: number;
  /** Array of visible candidate IDs. */
  candidatesVisible: Id[];
  /** Array of hidden candidate IDs. */
  candidatesHidden: Id[];
  /** Week when this pool was last refreshed. */
  lastRefreshWeek: number;
  /** Current scarcity level. */
  scarcityBand: "plentiful" | "normal" | "tight" | "scarce" | "crisis";
  /** Current quality level. */
  qualityBand: "low" | "normal" | "high" | "golden_age";
}

/**
 * Defines the structure for talent pool world state.
 * Container for all talent pools in the world.
 */
export interface TalentPoolWorldState {
  /** Version identifier for data migration. */
  version: "1.0.0";
  /** Year when the last yearly refresh occurred. */
  lastYearlyRefreshYear: number;
  /** Map of candidate IDs to candidate data. */
  candidates: Record<Id, TalentCandidate>;
  /** Map of pool types to pool states. */
  pools: Record<TalentPoolType, TalentPoolState>;

  /**
   * Player scouting data: candidate ID → scouting info.
   * Tracks how much the player has scouted each candidate.
   */
  playerScouting?: Record<Id, { scoutingLevel: number; lastScoutedWeek: number }>;
}
