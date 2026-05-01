/**
 * src/engine/systems/narrative/NarrativeBands.ts
 * ==============================================
 * Declarative band definitions for Sumo Manager Pro.
 *
 * Defines the [min, max) ranges for qualitative descriptors.
 * Used by the Hysteresis Engine to translate raw numbers into labels.
 */

/** Generic band definition structure */
export interface BandDef<T extends string> {
  band: T;
  min: number; // inclusive
  max: number; // exclusive (use Infinity for top band)
}

// === Stat Bands (0–100) ===
export type StatBand =
  | "exceptional"
  | "outstanding"
  | "strong"
  | "capable"
  | "developing"
  | "limited"
  | "struggling";

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
export type FatigueBand = "fresh" | "alert" | "light" | "tired" | "worn" | "exhausted" | "spent";

export const FATIGUE_BANDS: BandDef<FatigueBand>[] = [
  { band: "fresh", min: 0, max: 10 },
  { band: "alert", min: 10, max: 25 },
  { band: "light", min: 25, max: 40 },
  { band: "tired", min: 40, max: 55 },
  { band: "worn", min: 55, max: 70 },
  { band: "exhausted", min: 70, max: 85 },
  { band: "spent", min: 85, max: Infinity },
];

// === Momentum Bands (-5 to +5 or 0–100) ===
export type MomentumBand = "on_fire" | "rising" | "steady" | "struggling" | "in_crisis";

// === Rivalry Heat Bands (0–100) ===
export type RivalryHeatBand =
  | "dormant"
  | "simmering"
  | "heated"
  | "fierce"
  | "legendary"
  | "inferno"
  | "hot"
  | "warm"
  | "cold";

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
  { band: "star", min: 72, max: 87 },
  { band: "solid", min: 55, max: 71 },
  { band: "average", min: 35, max: 54 },
  { band: "limited", min: 0, max: 34 },
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
  { band: "nominal", min: 0, max: 10000 },
  { band: "modest", min: 10000, max: 100000 },
  { band: "notable", min: 100000, max: 1000000 },
  { band: "prestigious", min: 1000000, max: 10000000 },
  { band: "grand", min: 10000000, max: Infinity },
];

// === Trait Bands (0–100 oyakata/rikishi trait scores) ===
export type TraitBand = "negligible" | "minor" | "moderate" | "strong" | "dominant";

export const TRAIT_BANDS: BandDef<TraitBand>[] = [
  { band: "negligible", min: 0, max: 20 },
  { band: "minor", min: 20, max: 40 },
  { band: "moderate", min: 40, max: 60 },
  { band: "strong", min: 60, max: 80 },
  { band: "dominant", min: 80, max: Infinity },
];

// =============================================================================
// === Japanese Descriptor Bands (Canonical Separation)
// =============================================================================

export interface DescriptorBand {
  id: string; // key for archive.json lookup
  label: string; // Resolved via BardEngine
  tooltip: string; // Resolved via BardEngine
  colorCode: string; // Tailwind color class
}

// --- Condition / Stamina ---
export const CONDITION_DESCRIPTOR_BANDS: Array<{
  min: number;
  max: number;
  id: string;
  colorCode: string;
}> = [
  { min: 0.85, max: 1.01, id: "Zekkouchou", colorCode: "text-green-600" },
  { min: 0.6, max: 0.85, id: "Bachi-bachi", colorCode: "text-blue-500" },
  { min: 0.35, max: 0.6, id: "Iki-girashite", colorCode: "text-yellow-500" },
  { min: 0.0, max: 0.35, id: "Koshi-kudake", colorCode: "text-red-500" },
];

// --- Morale / Mental State ---
export const MORALE_DESCRIPTOR_BANDS: Array<{
  min: number;
  max: number;
  id: string;
  colorCode: string;
}> = [
  { min: 0.85, max: 1.01, id: "Shin-Gi-Tai", colorCode: "text-purple-600" },
  { min: 0.6, max: 0.85, id: "Kiai juubun", colorCode: "text-blue-500" },
  { min: 0.35, max: 0.6, id: "Mayoi", colorCode: "text-yellow-500" },
  { min: 0.0, max: 0.35, id: "Fugainai", colorCode: "text-red-500" },
];

// --- Hidden Potential ---
export const POTENTIAL_DESCRIPTOR_BANDS: Array<{
  min: number;
  max: number;
  id: string;
  colorCode: string;
}> = [
  { min: 90, max: 101, id: "Taiki Bansei", colorCode: "text-amber-500" },
  { min: 75, max: 90, id: "Soshitsu Ari", colorCode: "text-blue-500" },
  { min: 50, max: 75, id: "Mikan no Taiki", colorCode: "text-slate-400" },
  { min: 0, max: 50, id: "Genkai", colorCode: "text-slate-500" },
];

// === Age Bands (years) ===
export type AgeBand = "prodigy" | "young" | "prime" | "veteran" | "aging" | "elder";

export const AGE_BANDS: BandDef<AgeBand>[] = [
  { band: "prodigy", min: 15, max: 20 }, // Exceptionally young
  { band: "young", min: 20, max: 25 }, // Rising star age
  { band: "prime", min: 25, max: 32 }, // Peak performance years
  { band: "veteran", min: 32, max: 38 }, // Experienced, still competing
  { band: "aging", min: 38, max: 43 }, // Late career
  { band: "elder", min: 43, max: Infinity }, // Near retirement
];

// === Experience Bands (0-100 scale) ===
export type ExperienceBand = "novice" | "developing" | "seasoned" | "veteran" | "master";

export const EXPERIENCE_BANDS: BandDef<ExperienceBand>[] = [
  { band: "novice", min: 0, max: 20 },
  { band: "developing", min: 20, max: 40 },
  { band: "seasoned", min: 40, max: 60 },
  { band: "veteran", min: 60, max: 80 },
  { band: "master", min: 80, max: Infinity },
];

// === Weight Bands (kg) ===
export type WeightBand = "flyweight" | "lightweight" | "middleweight" | "heavyweight" | "super_heavyweight";

export const WEIGHT_BANDS: BandDef<WeightBand>[] = [
  { band: "flyweight", min: 0, max: 100 }, // < 100kg
  { band: "lightweight", min: 100, max: 120 }, // 100-120kg
  { band: "middleweight", min: 120, max: 150 }, // 120-150kg
  { band: "heavyweight", min: 150, max: 180 }, // 150-180kg
  { band: "super_heavyweight", min: 180, max: Infinity }, // 180kg+
];

// === Reputation Bands (0-100) ===
export type ReputationBand = "obscure" | "known" | "respected" | "renowned" | "legendary";

export const REPUTATION_BANDS: BandDef<ReputationBand>[] = [
  { band: "obscure", min: 0, max: 20 },
  { band: "known", min: 20, max: 40 },
  { band: "respected", min: 40, max: 60 },
  { band: "renowned", min: 60, max: 80 },
  { band: "legendary", min: 80, max: Infinity },
];

// === Injury Severity Bands (0-100) ===
export type InjurySeverityBand = "minimal" | "mild" | "moderate" | "severe" | "critical";

export const INJURY_SEVERITY_BANDS: BandDef<InjurySeverityBand>[] = [
  { band: "minimal", min: 0, max: 20 }, // minor
  { band: "mild", min: 20, max: 40 },
  { band: "moderate", min: 40, max: 60 }, // moderate
  { band: "severe", min: 60, max: 80 }, // serious
  { band: "critical", min: 80, max: Infinity },
];

// === Win Rate Bands (0-100%) ===
export type WinRateBand = "dismal" | "poor" | "mediocre" | "decent" | "strong" | "dominant";

export const WIN_RATE_BANDS: BandDef<WinRateBand>[] = [
  { band: "dismal", min: 0, max: 25 }, // < 25%
  { band: "poor", min: 25, max: 40 }, // 25-40%
  { band: "mediocre", min: 40, max: 48 }, // 40-48%
  { band: "decent", min: 48, max: 55 }, // 48-55%
  { band: "strong", min: 55, max: 65 }, // 55-65%
  { band: "dominant", min: 65, max: Infinity }, // 65%+
];

// === Height Bands (cm) ===
export type HeightBand = "short" | "average" | "tall" | "giant";

export const HEIGHT_BANDS: BandDef<HeightBand>[] = [
  { band: "short", min: 0, max: 170 }, // < 170cm
  { band: "average", min: 170, max: 185 }, // 170-185cm
  { band: "tall", min: 185, max: 195 }, // 185-195cm
  { band: "giant", min: 195, max: Infinity }, // 195cm+
];
