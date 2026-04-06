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
export type RivalryHeatBand = "dormant" | "simmering" | "heated" | "fierce" | "legendary" | "inferno" | "hot" | "warm" | "cold";

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

// === Prize Bands (yen amounts) ===
export type PrizeBand = "nominal" | "modest" | "notable" | "prestigious" | "grand";

export const PRIZE_BANDS: BandDef<PrizeBand>[] = [
  { band: "nominal",     min: 0,          max: 10000 },
  { band: "modest",      min: 10000,      max: 100000 },
  { band: "notable",     min: 100000,     max: 1000000 },
  { band: "prestigious", min: 1000000,    max: 10000000 },
  { band: "grand",       min: 10000000,   max: Infinity },
];

// === Trait Bands (0–100 oyakata/rikishi trait scores) ===
export type TraitBand = "negligible" | "minor" | "moderate" | "strong" | "dominant";

export const TRAIT_BANDS: BandDef<TraitBand>[] = [
  { band: "negligible", min: 0,  max: 20 },
  { band: "minor",      min: 20, max: 40 },
  { band: "moderate",   min: 40, max: 60 },
  { band: "strong",     min: 60, max: 80 },
  { band: "dominant",   min: 80, max: Infinity },
];

// =============================================================================
// === Japanese Descriptor Bands (Canonical Separation)
// =============================================================================
// These bands replace raw 0–1 floats on the UI layer with localized sumo
// terminology. The Presentation layer must only receive DescriptorBand objects.

export interface DescriptorBand {
  label: string;      // The localized sumo term (e.g. "Zekkouchou (絶好調)")
  tooltip: string;    // Explicit mechanical translation for players
  colorCode: string;  // Tailwind color class (e.g. "text-green-600")
}

// --- Condition / Stamina (Iki & Koshi — Breath & Hips) ---
// Input: r.condition (0.0–1.0 float)
export const CONDITION_DESCRIPTOR_BANDS: Array<{ min: number; max: number; band: DescriptorBand }> = [
  {
    min: 0.85, max: 1.01,
    band: {
      label: "Zekkouchou (絶好調)",
      tooltip: "Legs are deeply rooted; lungs are full. Maximum resistance to late-bout fatigue and throws.",
      colorCode: "text-green-600",
    },
  },
  {
    min: 0.60, max: 0.85,
    band: {
      label: "Bachi-bachi (ばちばち)",
      tooltip: "Moving with snap and vigor. Capable of sustained pushing attacks.",
      colorCode: "text-blue-500",
    },
  },
  {
    min: 0.35, max: 0.60,
    band: {
      label: "Iki-girashite (息を切らして)",
      tooltip: "Starting to breathe heavily. Susceptible to fatigue in extended grappling (Yotsu) bouts.",
      colorCode: "text-yellow-500",
    },
  },
  {
    min: 0.00, max: 0.35,
    band: {
      label: "Koshi-kudake (腰砕け)",
      tooltip: "Legs are entirely gone. Highly vulnerable to pull-downs (Hikiotoshi) and slap-downs.",
      colorCode: "text-red-500",
    },
  },
];

// --- Morale / Mental State (Kiai — Fighting Spirit) ---
// Input: r.motivation (0.0–1.0 float)
export const MORALE_DESCRIPTOR_BANDS: Array<{ min: number; max: number; band: DescriptorBand }> = [
  {
    min: 0.85, max: 1.01,
    band: {
      label: "Shin-Gi-Tai (心技体)",
      tooltip: "Mind, technique, and body are aligned. Highly resistant to Henka (sidesteps) and pressure.",
      colorCode: "text-purple-600",
    },
  },
  {
    min: 0.60, max: 0.85,
    band: {
      label: "Kiai juubun (気合十分)",
      tooltip: "Focused and aggressive. Likely to initiate a strong, forward-moving tachiai (initial charge).",
      colorCode: "text-blue-500",
    },
  },
  {
    min: 0.35, max: 0.60,
    band: {
      label: "Mayoi (迷い)",
      tooltip: "Second-guessing their sumo. Tachiai may lack power; prone to being pushed back early.",
      colorCode: "text-yellow-500",
    },
  },
  {
    min: 0.00, max: 0.35,
    band: {
      label: "Fugainai (不甲斐ない)",
      tooltip: "Completely demoralized. Prone to easy mistakes, false starts (Matta), and yielding the belt.",
      colorCode: "text-red-500",
    },
  },
];

// --- Hidden Potential (Soshitsu — Innate Talent) ---
// Input: r.talentSeed (0–100 integer)
export const POTENTIAL_DESCRIPTOR_BANDS: Array<{ min: number; max: number; band: DescriptorBand }> = [
  {
    min: 90, max: 101,
    band: {
      label: "Taiki Bansei (大器晩成)",
      tooltip: "A generational talent capable of reaching Yokozuna. Exceptional stat growth ceilings.",
      colorCode: "text-amber-500",
    },
  },
  {
    min: 75, max: 90,
    band: {
      label: "Soshitsu Ari (素質あり)",
      tooltip: "Strong fundamentals. A definite San'yaku (champion) candidate if trained rigorously.",
      colorCode: "text-blue-500",
    },
  },
  {
    min: 50, max: 75,
    band: {
      label: "Mikan no Taiki (未完の大器)",
      tooltip: "Average prospect. Will require specialized, intense training to survive the top division.",
      colorCode: "text-slate-400",
    },
  },
  {
    min: 0, max: 50,
    band: {
      label: "Genkai (限界)",
      tooltip: "Physical limits are apparent. Best suited as a reliable lower-division stable pillar.",
      colorCode: "text-slate-500",
    },
  },
];
