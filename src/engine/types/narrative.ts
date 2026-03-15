/**
 * Narrative Bands & Misc Shared Types
 */

export type StatureBand = "legendary" | "powerful" | "established" | "rebuilding" | "fragile" | "new";
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

// Scouting convenience unions
/** Type representing confidence level. */
export type ConfidenceLevel = "unknown" | "low" | "medium" | "high" | "certain";
/** Type representing scouting investment. */
export type ScoutingInvestment = "none" | "light" | "standard" | "deep";

// Leverage types
/** Type representing leverage class. */
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
