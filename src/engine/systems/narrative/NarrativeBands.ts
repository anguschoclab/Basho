/**
 * src/engine/systems/narrative/NarrativeBands.ts
 * ==============================================
 * Declarative band definitions for Sumo Manager Pro.
 * 
 * Defines the [min, max) ranges for qualitative descriptors.
 * Used by the Hysteresis Engine to translate raw numbers into labels.
 * 
 * Goal: Single source of truth for observability.
 */

import type { RikishiArchetype } from "../../types/combat";

/** Generic band definition structure */
export interface BandDef<T extends string> {
  band: T;
  min: number; // inclusive
  max: number; // exclusive (use Infinity for top band)
}

// === Stat Bands (0–100) ===
export type StatBand = "exceptional" | "outstanding" | "strong" | "capable" | "developing" | "limited" | "struggling";

export const STAT_BANDS: BandDef<StatBand>[] = [
  { band: "struggling", min: 0, max: 15 },
  { band: "limited", min: 15, max: 30 },
  { band: "developing", min: 30, max: 45 },
  { band: "capable", min: 45, max: 60 },
  { band: "strong", min: 60, max: 75 },
  { band: "outstanding", min: 75, max: 90 },
  { band: "exceptional", min: 90, max: Infinity },
];

// === Fatigue Bands (0–100) ===
export type FatigueBand = "fresh" | "light" | "tired" | "exhausted" | "spent";

export const FATIGUE_BANDS: BandDef<FatigueBand>[] = [
  { band: "fresh", min: 0, max: 15 },
  { band: "light", min: 15, max: 35 },
  { band: "tired", min: 35, max: 55 },
  { band: "exhausted", min: 55, max: 75 },
  { band: "spent", min: 75, max: Infinity },
];

// === Momentum Bands (-5 to +5 or 0–100) ===
export type MomentumBand = "on_fire" | "rising" | "steady" | "struggling" | "in_crisis";

// === Rivalry Heat Bands (0–100) ===
export type RivalryHeatBand = "dormant" | "simmering" | "heated" | "fierce" | "legendary";

export const RIVALRY_HEAT_BANDS: BandDef<RivalryHeatBand>[] = [
  { band: "dormant", min: 0, max: 20 },
  { band: "simmering", min: 20, max: 40 },
  { band: "heated", min: 40, max: 65 },
  { band: "fierce", min: 65, max: 85 },
  { band: "legendary", min: 85, max: Infinity },
];

// === Financial Bands (runway weeks) ===
export type FinancialBand = "secure" | "comfortable" | "tight" | "critical" | "desperate";

// === Potential Bands (0–100 talentSeed) ===
export type PotentialBand = "generational" | "star" | "solid" | "average" | "limited" | "unknown";

export const POTENTIAL_BANDS: BandDef<PotentialBand>[] = [
  { band: "generational", min: 88, max: 100 },
  { band: "star",         min: 72, max: 87 },
  { band: "solid",        min: 55, max: 71 },
  { band: "average",      min: 35, max: 54 },
  { band: "limited",      min: 0,  max: 34 },
];

// === Scandal Bands (0–100) ===
export type ScandalBand = "clean" | "whispers" | "scrutiny" | "scandal" | "crisis";

export const SCANDAL_BANDS: BandDef<ScandalBand>[] = [
  { band: "clean", min: 0, max: 10 },
  { band: "whispers", min: 10, max: 30 },
  { band: "scrutiny", min: 30, max: 55 },
  { band: "scandal", min: 55, max: 80 },
  { band: "crisis", min: 80, max: Infinity },
];
