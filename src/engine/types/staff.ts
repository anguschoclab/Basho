/**
 * Staff Types
 */

import type { Id } from "./common";

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
export type StaffCareerPhase =
  | "apprentice"
  | "established"
  | "senior"
  | "declining"
  | "retired";

/** Type representing competence bands (qualitative descriptors). */
export type CompetenceBand =
  | "feeble"
  | "limited"
  | "serviceable"
  | "strong"
  | "great"
  | "dominant"
  | "monstrous";

export interface StaffCompetenceBands {
  primary: CompetenceBand;
  secondary?: CompetenceBand;
}

export type ReputationBand =
  | "unknown"
  | "questionable"
  | "respected"
  | "renowned"
  | "legendary";

export type LoyaltyBand =
  | "mercenary"
  | "wavering"
  | "stable"
  | "devoted"
  | "unshakable";

/** Defines the structure for a staff member. */
export interface Staff {
  id: Id;
  name: string;
  role: StaffRole;
  age: number;
  careerPhase: StaffCareerPhase;
  reputationBand: ReputationBand;
  loyaltyBand: LoyaltyBand;
  competenceBands: StaffCompetenceBands;
  fatigue: number; // 0 to 100
  scandalExposure: number; // 0 to 100
  yearsAtBeya: number;
  priorAffiliations: Id[];
  successorEligible: boolean;
}
