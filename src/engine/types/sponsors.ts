import type { Id } from "./common";

/** Type representing sponsor tier. */
export type SponsorTier = "T0" | "T1" | "T2" | "T3" | "T4" | "T5";

/** Type representing sponsor category. */
export type SponsorCategory =
  | "local_business"
  | "regional_corporation"
  | "national_brand"
  | "alumni_association"
  | "cultural_foundation"
  | "private_benefactor"
  | "anonymous_patron";

/** Type representing sponsor tone. */
export type SponsorTone = "traditional" | "modern" | "luxury" | "local" | "industrial" | "civic";

/** Type representing sponsor role. */
export type SponsorRole =
  | "kensho"
  | "koenkai_member"
  | "koenkai_pillar"
  | "benefactor"
  | "creditor";

/** Defines the structure for sponsor relationship. */
export interface SponsorRelationship {
  relId: Id;
  sponsorId: Id;
  targetType: "league" | "basho" | "heya" | "rikishi";
  targetId: Id;
  role: SponsorRole;
  strength: 1 | 2 | 3 | 4 | 5;
  startedAtTick: number;
  endsAtTick?: number;
  notesTag?: string;
}

/** Defines the structure for sponsor. */
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
  satisfaction: number; // 0..100 sentiment
  createdAtTick: number;
  lastSeenTick: number;
  relationships: SponsorRelationship[];
}

/** Type representing koenkai band type. */
export type KoenkaiBandType = "none" | "weak" | "moderate" | "strong" | "powerful";

/** Defines the structure for koenkai. */
export interface Koenkai {
  koenkaiId: string;
  heyaId: string;
  strengthBand: KoenkaiBandType;
  members: SponsorRelationship[];
  createdAtTick: number;
  lastChangedTick: number;
}

/** Defines the structure for kensho banner slot. */
export interface KenshoBannerSlot {
  bannerId: string;
  boutId: string;
  sponsorId: string;
  tier: SponsorTier;
  displayName: string;
  ceremonyStyleTag: "classic" | "premium" | "quiet";
}

/** Defines the structure for sponsor pool. */
export interface SponsorPool {
  sponsors: Map<string, Sponsor>;
  koenkais: Map<string, Koenkai>;
}
