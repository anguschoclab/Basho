/**
 * Talent Pool & Pipeline Types
 */

import type { Id } from "./common";
import type { TacticalArchetype, Style } from "./combat";

export type TalentPoolType = "high_school" | "university" | "foreign";

export type VisibilityBand = "public" | "rumored" | "obscure" | "hidden";

export type CandidateAvailabilityState =
  | "available"
  | "in_talks"
  | "signed"
  | "locked"
  | "withdrawn";

export type SuitorInterestBand = "low" | "medium" | "high" | "all_in";
export type SuitorOfferType = "standard" | "aggressive" | "prestige_pitch" | "covert";

export interface SuitorRef {
  heyaId: Id;
  interestBand: SuitorInterestBand;
  offerType: SuitorOfferType;
  deadlineWeek: number;
}

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
  availabilityState: CandidateAvailabilityState;
  competingSuitors: SuitorRef[];

  archetype: TacticalArchetype;
  style: Style;
  heightPotentialCm: number;
  weightPotentialKg: number;
  talentSeed: number;
  temperament: {
    discipline: number;
    volatility: number;
  };
  isAmateurStar?: boolean;
}

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

export interface TalentPoolWorldState {
  version: "1.0.0";
  lastYearlyRefreshYear: number;
  candidates: Record<Id, TalentCandidate>;
  pools: Record<TalentPoolType, TalentPoolState>;

  playerScouting?: Record<Id, { scoutingLevel: number; lastScoutedWeek: number }>;
}
