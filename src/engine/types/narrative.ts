/**
 * Narrative Bands & Misc Shared Types
 */

// Re-export band types from NarrativeBands for convenience
export type {
  AgeBand,
  ExperienceBand,
  WeightBand,
  ReputationBand,
  InjurySeverityBand,
  WinRateBand,
} from "../systems/narrative/NarrativeBands";

export type StatureBand =
  | "legendary"
  | "powerful"
  | "established"
  | "rebuilding"
  | "fragile"
  | "new";
/** Type representing prestige band. */
export type PrestigeBand = "elite" | "respected" | "modest" | "struggling" | "unknown";
/** Type representing facilities band. */
export type FacilitiesBand = "world_class" | "excellent" | "adequate" | "basic" | "minimal";

/** Type representing koenkai band type. */
export type KoenkaiBandType = "none" | "weak" | "moderate" | "strong" | "powerful";
/** Type representing koenkai band. */
export type KoenkaiBand = KoenkaiBandType;
/** Type representing runway band. */
export type RunwayBand = "secure" | "comfortable" | "tight" | "critical" | "desperate";

export type ConfidenceLevel = "unknown" | "low" | "medium" | "high" | "certain";
export type ScoutingInvestment = "none" | "light" | "standard" | "deep";

export type LeverageClass = "CompactAnchor" | "LongLever" | "TopHeavy" | "MobileLight" | "Standard";

// FTUE
/** Defines the structure for f t u e state. */
export interface FTUEState {
  isActive: boolean;
  bashoCompleted: number;
  suppressedEvents: string[];
}

// Stable selection
/** Type representing stable selection mode. */
export type StableSelectionMode = "take_over" | "recommended";
