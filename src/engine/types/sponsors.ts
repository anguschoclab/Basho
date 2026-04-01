import type { Id } from "./common";

export type SponsorTier = "T0" | "T1" | "T2" | "T3" | "T4" | "T5";

export type SponsorCategory =
  | "local_business"
  | "regional_corporation"
  | "national_brand"
  | "alumni_association"
  | "cultural_foundation"
  | "private_benefactor"
  | "anonymous_patron";

export type SponsorTone = "traditional" | "modern" | "luxury" | "local" | "industrial" | "civic";

export type SponsorRole = "kensho" | "koenkai_member" | "koenkai_pillar" | "benefactor" | "creditor";

export interface SponsorRelationship {
  relId: string;
  sponsorId: string;
  targetType: "league" | "basho" | "beya" | "rikishi";
  targetId: string;
  role: SponsorRole;
  strength: 1 | 2 | 3 | 4 | 5;
  startedAtTick: number;
  endsAtTick?: number;
  notesTag?: string;
}

export interface Sponsor {
  sponsorId: string;
  displayName: string;
  shortName?: string;
  category: SponsorCategory;
  tier: SponsorTier;
  originRegionId: string;
  industryTag: string;
  toneTag: SponsorTone;

  // Hidden simulation traits
  prestigeAffinity: number; // 0..100
  loyalty: number; // 0..100
  scandalTolerance: number; // 0..100
  riskAppetite: number; // 0..100
  visibilityPreference: 0 | 1 | 2;

  // Dynamic state
  active: boolean;
  createdAtTick: number;
  lastSeenTick: number;
  relationships: SponsorRelationship[];
}

export type KoenkaiBandType = "none" | "weak" | "moderate" | "strong" | "powerful";

export interface Koenkai {
  koenkaiId: string;
  beyaId: string;
  strengthBand: KoenkaiBandType;
  members: SponsorRelationship[];
  createdAtTick: number;
  lastChangedTick: number;
}

export interface SponsorPool {
  activeSponsors: Id[];
  availableSponsors: Sponsor[];
  lastGenerationWeek: number;
}
