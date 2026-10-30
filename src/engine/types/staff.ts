/**
 * Staff Types
 */

import type { Id } from "@/engine/types/common";
import type { AvatarIdentity } from "@/engine/types/avatar";

/** Type representing a staff role. */
export type StaffRole =
  | "oyakata"
  | "assistant_oyakata"
  | "technique_coach"
  | "conditioning_coach"
  | "nutritionist"
  | "medical_staff"
  | "scout"
  | "administrator";

/** Type representing a staff's career phase. */
export type StaffCareerPhase = "apprentice" | "established" | "senior" | "declining" | "retired";

/** Type representing competence bands (qualitative descriptors). */
export type CompetenceBand =
  "feeble" | "limited" | "serviceable" | "strong" | "great" | "dominant" | "monstrous";

export interface StaffCompetenceBands {
  primary: CompetenceBand;
  secondary?: CompetenceBand;
}

export type StaffReputationBand =
  "unknown" | "questionable" | "respected" | "renowned" | "legendary";

export type StaffLoyaltyBand = "mercenary" | "wavering" | "stable" | "devoted" | "unshakable";

export interface Staff {
  id: Id;
  heyaId: Id;
  name: string;
  role: StaffRole;
  age: number;
  careerPhase: StaffCareerPhase;
  reputationBand: StaffReputationBand;
  loyaltyBand: StaffLoyaltyBand;
  competenceBands: StaffCompetenceBands;
  fatigue: number; // 0 to 100
  morale: number; // 0 to 100 (New)
  scandalExposure: number; // 0 to 100
  yearsAtBeya: number;
  priorAffiliations: Id[];
  successorEligible: boolean;
  avatarConfig?: AvatarIdentity;
  /** P2: monthly wage in yen (0 for legacy/unpaid staff). */
  wageYen?: number;
  /** P2: year the current contract ends (auto-release at expiry). */
  contractEndYear?: number;
  /** P2: 0–10 aggregate skill score displayed on staff cards. */
  skill?: number;
}

/** A hirable staff candidate in the monthly-refreshed pool (P2). */
export interface StaffCandidate {
  id: Id;
  name: string;
  role: StaffRole;
  age: number;
  skill: number; // 0–10
  wageYen: number; // asking wage (monthly)
  contractEndYear: number;
  competenceBands: StaffCompetenceBands;
  reputationBand: StaffReputationBand;
  note?: string;
}
