/**
 * Narrative Bands & Misc Shared Types
 */

export type StatureBand = "legendary" | "powerful" | "established" | "rebuilding" | "fragile" | "new";
export type PrestigeBand = "elite" | "respected" | "modest" | "struggling" | "unknown";
export type FacilitiesBand = "world_class" | "excellent" | "adequate" | "basic" | "minimal";

export type KoenkaiBandType = "none" | "weak" | "moderate" | "strong" | "powerful";
export type KoenkaiBand = KoenkaiBandType;
export type RunwayBand = "secure" | "comfortable" | "tight" | "critical" | "desperate";

// Scouting convenience unions
export type ConfidenceLevel = "unknown" | "low" | "medium" | "high" | "certain";
export type ScoutingInvestment = "none" | "light" | "standard" | "deep";

// Leverage types
export type LeverageClass = "CompactAnchor" | "LongLever" | "TopHeavy" | "MobileLight" | "Standard";

// FTUE
export interface FTUEState {
  isActive: boolean;
  bashoCompleted: number;
  suppressedEvents: string[];
}

// Stable selection
export type StableSelectionMode = "take_over" | "recommended";
