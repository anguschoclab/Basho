/**
 * src/engine/systems/narrative/NarrativeBands.ts
 * ==============================================
 * Declarative band definitions for Sumo Manager Pro.
 *
 * Defines the [min, max) ranges for qualitative descriptors.
 * Used by the Hysteresis Engine to translate raw numbers into labels.
 */

import {
  STAT_BAND_STRUGGLING_MAX,
  STAT_BAND_LIMITED_MAX,
  STAT_BAND_DEVELOPING_MAX,
  STAT_BAND_CAPABLE_MAX,
  STAT_BAND_STRONG_MAX,
  STAT_BAND_OUTSTANDING_MAX,
  FATIGUE_BAND_FRESH_MAX,
  FATIGUE_BAND_ALERT_MAX,
  FATIGUE_BAND_LIGHT_MAX,
  FATIGUE_BAND_TIRED_MAX,
  FATIGUE_BAND_WORN_MAX,
  FATIGUE_BAND_EXHAUSTED_MAX,
  RIVALRY_HEAT_DORMANT_MAX,
  RIVALRY_HEAT_SIMMERING_MAX,
  RIVALRY_HEAT_HEATED_MAX,
  RIVALRY_HEAT_FIERCE_MAX,
  POTENTIAL_BAND_LIMITED_MAX,
  POTENTIAL_BAND_AVERAGE_MAX,
  POTENTIAL_BAND_SOLID_MAX,
  POTENTIAL_BAND_STAR_MAX,
  SCANDAL_BAND_CLEAN_MAX,
  SCANDAL_BAND_WHISPERS_MAX,
  SCANDAL_BAND_SCRUTINY_MAX,
  SCANDAL_BAND_SCANDAL_MAX,
  PRIZE_BAND_NOMINAL_MAX,
  PRIZE_BAND_MODEST_MAX,
  PRIZE_BAND_NOTABLE_MAX,
  PRIZE_BAND_PRESTIGIOUS_MAX,
  TRAIT_BAND_NEGLIGIBLE_MAX,
  TRAIT_BAND_MINOR_MAX,
  TRAIT_BAND_MODERATE_MAX,
  TRAIT_BAND_STRONG_MAX,
  CONDITION_ZEKKOUCHOU_MIN,
  CONDITION_BACHI_BACHI_MIN,
  CONDITION_IKI_GIRASHITE_MIN,
  MORALE_SHIN_GI_TAI_MIN,
  MORALE_KIAI_JUUBUN_MIN,
  MORALE_MAYOI_MIN,
  POTENTIAL_TAIKI_BANSEI_MIN,
  POTENTIAL_SOSHITSU_ARI_MIN,
  POTENTIAL_MIKAN_NO_TAIKI_MIN,
  AGE_BAND_PRODIGY_MAX,
  AGE_BAND_YOUNG_MAX,
  AGE_BAND_PRIME_MAX,
  AGE_BAND_VETERAN_MAX,
  AGE_BAND_AGING_MAX,
  EXPERIENCE_BAND_NOVICE_MAX,
  EXPERIENCE_BAND_DEVELOPING_MAX,
  EXPERIENCE_BAND_SEASONED_MAX,
  EXPERIENCE_BAND_VETERAN_MAX,
  WEIGHT_BAND_LEAN_MAX,
  WEIGHT_BAND_SOLID_MAX,
  WEIGHT_BAND_POWERFUL_MAX,
  WEIGHT_BAND_MASSIVE_MAX,
  REPUTATION_BAND_OBSCURE_MAX,
  REPUTATION_BAND_KNOWN_MAX,
  REPUTATION_BAND_RESPECTED_MAX,
  REPUTATION_BAND_RENOWNED_MAX,
  INJURY_SEVERITY_MINIMAL_MAX,
  INJURY_SEVERITY_MILD_MAX,
  INJURY_SEVERITY_MODERATE_MAX,
  INJURY_SEVERITY_SEVERE_MAX,
  WIN_RATE_BAND_DISMAL_MAX,
  WIN_RATE_BAND_POOR_MAX,
  WIN_RATE_BAND_MEDIOCRE_MAX,
  WIN_RATE_BAND_DECENT_MAX,
  WIN_RATE_BAND_STRONG_MAX,
  HEIGHT_BAND_SHORT_MAX,
  HEIGHT_BAND_AVERAGE_MAX,
  HEIGHT_BAND_TALL_MAX,
  HEIGHT_BAND_GIANT_MAX,
} from "../../../constants/engine/generation";

/** Generic band definition structure */
export interface BandDef<T extends string> {
  band: T;
  min: number; // inclusive
  max: number; // exclusive (use Infinity for top band)
}

// === Stat Bands (0–100) ===
export type StatBand =
  "exceptional" | "outstanding" | "strong" | "capable" | "developing" | "limited" | "struggling";

export const STAT_BANDS: BandDef<StatBand>[] = [
  { band: "struggling", min: 0, max: STAT_BAND_STRUGGLING_MAX },
  { band: "limited", min: STAT_BAND_STRUGGLING_MAX, max: STAT_BAND_LIMITED_MAX },
  { band: "developing", min: STAT_BAND_LIMITED_MAX, max: STAT_BAND_DEVELOPING_MAX },
  { band: "capable", min: STAT_BAND_DEVELOPING_MAX, max: STAT_BAND_CAPABLE_MAX },
  { band: "strong", min: STAT_BAND_CAPABLE_MAX, max: STAT_BAND_STRONG_MAX },
  { band: "outstanding", min: STAT_BAND_STRONG_MAX, max: STAT_BAND_OUTSTANDING_MAX },
  { band: "exceptional", min: STAT_BAND_OUTSTANDING_MAX, max: Infinity },
];

// === Fatigue Bands (0–100) ===
export type FatigueBand = "fresh" | "alert" | "light" | "tired" | "worn" | "exhausted" | "spent";

export const FATIGUE_BANDS: BandDef<FatigueBand>[] = [
  { band: "fresh", min: 0, max: FATIGUE_BAND_FRESH_MAX },
  { band: "alert", min: FATIGUE_BAND_FRESH_MAX, max: FATIGUE_BAND_ALERT_MAX },
  { band: "light", min: FATIGUE_BAND_ALERT_MAX, max: FATIGUE_BAND_LIGHT_MAX },
  { band: "tired", min: FATIGUE_BAND_LIGHT_MAX, max: FATIGUE_BAND_TIRED_MAX },
  { band: "worn", min: FATIGUE_BAND_TIRED_MAX, max: FATIGUE_BAND_WORN_MAX },
  { band: "exhausted", min: FATIGUE_BAND_WORN_MAX, max: FATIGUE_BAND_EXHAUSTED_MAX },
  { band: "spent", min: FATIGUE_BAND_EXHAUSTED_MAX, max: Infinity },
];

// === Momentum Bands (-5 to +5 or 0–100) ===
export type MomentumBand = "on_fire" | "rising" | "steady" | "struggling" | "in_crisis";

// === Rivalry Heat Bands (0–100) ===
export type RivalryHeatBand = "dormant" | "simmering" | "heated" | "fierce" | "legendary";

export const RIVALRY_HEAT_BANDS: BandDef<RivalryHeatBand>[] = [
  { band: "dormant", min: 0, max: RIVALRY_HEAT_DORMANT_MAX },
  { band: "simmering", min: RIVALRY_HEAT_DORMANT_MAX, max: RIVALRY_HEAT_SIMMERING_MAX },
  { band: "heated", min: RIVALRY_HEAT_SIMMERING_MAX, max: RIVALRY_HEAT_HEATED_MAX },
  { band: "fierce", min: RIVALRY_HEAT_HEATED_MAX, max: RIVALRY_HEAT_FIERCE_MAX },
  { band: "legendary", min: RIVALRY_HEAT_FIERCE_MAX, max: Infinity },
];

// === Financial Bands (runway weeks) ===
export type FinancialBand = "secure" | "comfortable" | "tight" | "critical" | "desperate";

// === Potential Bands (0–100 talentSeed) ===
export type PotentialBand = "generational" | "star" | "solid" | "average" | "limited" | "unknown";

export const POTENTIAL_BANDS: BandDef<PotentialBand>[] = [
  { band: "limited", min: 0, max: POTENTIAL_BAND_LIMITED_MAX },
  { band: "average", min: POTENTIAL_BAND_LIMITED_MAX, max: POTENTIAL_BAND_AVERAGE_MAX },
  { band: "solid", min: POTENTIAL_BAND_AVERAGE_MAX, max: POTENTIAL_BAND_SOLID_MAX },
  { band: "star", min: POTENTIAL_BAND_SOLID_MAX, max: POTENTIAL_BAND_STAR_MAX },
  { band: "generational", min: POTENTIAL_BAND_STAR_MAX, max: Infinity },
];

// === Scandal Bands (0–100) ===
export type ScandalBand = "clean" | "whispers" | "scrutiny" | "scandal" | "crisis";

export const SCANDAL_BANDS: BandDef<ScandalBand>[] = [
  { band: "clean", min: 0, max: SCANDAL_BAND_CLEAN_MAX },
  { band: "whispers", min: SCANDAL_BAND_CLEAN_MAX, max: SCANDAL_BAND_WHISPERS_MAX },
  { band: "scrutiny", min: SCANDAL_BAND_WHISPERS_MAX, max: SCANDAL_BAND_SCRUTINY_MAX },
  { band: "scandal", min: SCANDAL_BAND_SCRUTINY_MAX, max: SCANDAL_BAND_SCANDAL_MAX },
  { band: "crisis", min: SCANDAL_BAND_SCANDAL_MAX, max: Infinity },
];

// === Prize Bands (yen amounts) ===
export type PrizeBand = "nominal" | "modest" | "notable" | "prestigious" | "grand";

export const PRIZE_BANDS: BandDef<PrizeBand>[] = [
  { band: "nominal", min: 0, max: PRIZE_BAND_NOMINAL_MAX },
  { band: "modest", min: PRIZE_BAND_NOMINAL_MAX, max: PRIZE_BAND_MODEST_MAX },
  { band: "notable", min: PRIZE_BAND_MODEST_MAX, max: PRIZE_BAND_NOTABLE_MAX },
  { band: "prestigious", min: PRIZE_BAND_NOTABLE_MAX, max: PRIZE_BAND_PRESTIGIOUS_MAX },
  { band: "grand", min: PRIZE_BAND_PRESTIGIOUS_MAX, max: Infinity },
];

// === Trait Bands (0–100 oyakata/rikishi trait scores) ===
export type TraitBand = "negligible" | "minor" | "moderate" | "strong" | "dominant";

export const TRAIT_BANDS: BandDef<TraitBand>[] = [
  { band: "negligible", min: 0, max: TRAIT_BAND_NEGLIGIBLE_MAX },
  { band: "minor", min: TRAIT_BAND_NEGLIGIBLE_MAX, max: TRAIT_BAND_MINOR_MAX },
  { band: "moderate", min: TRAIT_BAND_MINOR_MAX, max: TRAIT_BAND_MODERATE_MAX },
  { band: "strong", min: TRAIT_BAND_MODERATE_MAX, max: TRAIT_BAND_STRONG_MAX },
  { band: "dominant", min: TRAIT_BAND_STRONG_MAX, max: Infinity },
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
  { min: CONDITION_ZEKKOUCHOU_MIN, max: 1.01, id: "Zekkouchou", colorCode: "text-green-600" },
  {
    min: CONDITION_BACHI_BACHI_MIN,
    max: CONDITION_ZEKKOUCHOU_MIN,
    id: "Bachi-bachi",
    colorCode: "text-blue-500",
  },
  {
    min: CONDITION_IKI_GIRASHITE_MIN,
    max: CONDITION_BACHI_BACHI_MIN,
    id: "Iki-girashite",
    colorCode: "text-yellow-500",
  },
  { min: 0.0, max: CONDITION_IKI_GIRASHITE_MIN, id: "Koshi-kudake", colorCode: "text-red-500" },
];

// --- Morale / Mental State ---
export const MORALE_DESCRIPTOR_BANDS: Array<{
  min: number;
  max: number;
  id: string;
  colorCode: string;
}> = [
  { min: MORALE_SHIN_GI_TAI_MIN, max: 1.01, id: "Shin-Gi-Tai", colorCode: "text-purple-600" },
  {
    min: MORALE_KIAI_JUUBUN_MIN,
    max: MORALE_SHIN_GI_TAI_MIN,
    id: "Kiai juubun",
    colorCode: "text-blue-500",
  },
  { min: MORALE_MAYOI_MIN, max: MORALE_KIAI_JUUBUN_MIN, id: "Mayoi", colorCode: "text-yellow-500" },
  { min: 0.0, max: MORALE_MAYOI_MIN, id: "Fugainai", colorCode: "text-red-500" },
];

// --- Hidden Potential ---
export const POTENTIAL_DESCRIPTOR_BANDS: Array<{
  min: number;
  max: number;
  id: string;
  colorCode: string;
}> = [
  { min: POTENTIAL_TAIKI_BANSEI_MIN, max: 101, id: "Taiki Bansei", colorCode: "text-amber-500" },
  {
    min: POTENTIAL_SOSHITSU_ARI_MIN,
    max: POTENTIAL_TAIKI_BANSEI_MIN,
    id: "Soshitsu Ari",
    colorCode: "text-blue-500",
  },
  {
    min: POTENTIAL_MIKAN_NO_TAIKI_MIN,
    max: POTENTIAL_SOSHITSU_ARI_MIN,
    id: "Mikan no Taiki",
    colorCode: "text-slate-400",
  },
  { min: 0, max: POTENTIAL_MIKAN_NO_TAIKI_MIN, id: "Genkai", colorCode: "text-slate-500" },
];

// === Age Bands (years) ===
export type AgeBand = "prodigy" | "young" | "prime" | "veteran" | "aging" | "elder";

export const AGE_BANDS: BandDef<AgeBand>[] = [
  { band: "prodigy", min: 15, max: AGE_BAND_PRODIGY_MAX }, // Exceptionally young
  { band: "young", min: AGE_BAND_PRODIGY_MAX, max: AGE_BAND_YOUNG_MAX }, // Rising star age
  { band: "prime", min: AGE_BAND_YOUNG_MAX, max: AGE_BAND_PRIME_MAX }, // Peak performance years
  { band: "veteran", min: AGE_BAND_PRIME_MAX, max: AGE_BAND_VETERAN_MAX }, // Experienced, still competing
  { band: "aging", min: AGE_BAND_VETERAN_MAX, max: AGE_BAND_AGING_MAX }, // Late career
  { band: "elder", min: AGE_BAND_AGING_MAX, max: Infinity }, // Near retirement
];

// === Experience Bands (0-100 scale) ===
export type ExperienceBand = "novice" | "developing" | "seasoned" | "veteran" | "master";

export const EXPERIENCE_BANDS: BandDef<ExperienceBand>[] = [
  { band: "novice", min: 0, max: EXPERIENCE_BAND_NOVICE_MAX },
  { band: "developing", min: EXPERIENCE_BAND_NOVICE_MAX, max: EXPERIENCE_BAND_DEVELOPING_MAX },
  { band: "seasoned", min: EXPERIENCE_BAND_DEVELOPING_MAX, max: EXPERIENCE_BAND_SEASONED_MAX },
  { band: "veteran", min: EXPERIENCE_BAND_SEASONED_MAX, max: EXPERIENCE_BAND_VETERAN_MAX },
  { band: "master", min: EXPERIENCE_BAND_VETERAN_MAX, max: Infinity },
];

// === Weight Bands (kg) ===
export type WeightBand = "lean" | "solid" | "powerful" | "massive" | "imposing";

export const WEIGHT_BANDS: BandDef<WeightBand>[] = [
  { band: "lean", min: 0, max: WEIGHT_BAND_LEAN_MAX }, // < 100kg
  { band: "solid", min: WEIGHT_BAND_LEAN_MAX, max: WEIGHT_BAND_SOLID_MAX }, // 100–120kg
  { band: "powerful", min: WEIGHT_BAND_SOLID_MAX, max: WEIGHT_BAND_POWERFUL_MAX }, // 120–150kg
  { band: "massive", min: WEIGHT_BAND_POWERFUL_MAX, max: WEIGHT_BAND_MASSIVE_MAX }, // 150–180kg
  { band: "imposing", min: WEIGHT_BAND_MASSIVE_MAX, max: Infinity }, // 180kg+
];

// === Reputation Bands (0-100) ===
export type ReputationBand = "obscure" | "known" | "respected" | "renowned" | "legendary";

export const REPUTATION_BANDS: BandDef<ReputationBand>[] = [
  { band: "obscure", min: 0, max: REPUTATION_BAND_OBSCURE_MAX },
  { band: "known", min: REPUTATION_BAND_OBSCURE_MAX, max: REPUTATION_BAND_KNOWN_MAX },
  { band: "respected", min: REPUTATION_BAND_KNOWN_MAX, max: REPUTATION_BAND_RESPECTED_MAX },
  { band: "renowned", min: REPUTATION_BAND_RESPECTED_MAX, max: REPUTATION_BAND_RENOWNED_MAX },
  { band: "legendary", min: REPUTATION_BAND_RENOWNED_MAX, max: Infinity },
];

// === Injury Severity Bands (0-100) ===
export type InjurySeverityBand = "minimal" | "mild" | "moderate" | "severe" | "critical";

export const INJURY_SEVERITY_BANDS: BandDef<InjurySeverityBand>[] = [
  { band: "minimal", min: 0, max: INJURY_SEVERITY_MINIMAL_MAX }, // minor
  { band: "mild", min: INJURY_SEVERITY_MINIMAL_MAX, max: INJURY_SEVERITY_MILD_MAX },
  { band: "moderate", min: INJURY_SEVERITY_MILD_MAX, max: INJURY_SEVERITY_MODERATE_MAX }, // moderate
  { band: "severe", min: INJURY_SEVERITY_MODERATE_MAX, max: INJURY_SEVERITY_SEVERE_MAX }, // serious
  { band: "critical", min: INJURY_SEVERITY_SEVERE_MAX, max: Infinity },
];

// === Win Rate Bands (0-100%) ===
export type WinRateBand = "dismal" | "poor" | "mediocre" | "decent" | "strong" | "dominant";

export const WIN_RATE_BANDS: BandDef<WinRateBand>[] = [
  { band: "dismal", min: 0, max: WIN_RATE_BAND_DISMAL_MAX }, // < 25%
  { band: "poor", min: WIN_RATE_BAND_DISMAL_MAX, max: WIN_RATE_BAND_POOR_MAX }, // 25-40%
  { band: "mediocre", min: WIN_RATE_BAND_POOR_MAX, max: WIN_RATE_BAND_MEDIOCRE_MAX }, // 40-48%
  { band: "decent", min: WIN_RATE_BAND_MEDIOCRE_MAX, max: WIN_RATE_BAND_DECENT_MAX }, // 48-55%
  { band: "strong", min: WIN_RATE_BAND_DECENT_MAX, max: WIN_RATE_BAND_STRONG_MAX }, // 55-65%
  { band: "dominant", min: WIN_RATE_BAND_STRONG_MAX, max: Infinity }, // 65%+
];

// === Height Bands (cm) ===
export type HeightBand = "short" | "average" | "tall" | "giant" | "towering";

export const HEIGHT_BANDS: BandDef<HeightBand>[] = [
  { band: "short", min: 0, max: HEIGHT_BAND_SHORT_MAX }, // < 170cm
  { band: "average", min: HEIGHT_BAND_SHORT_MAX, max: HEIGHT_BAND_AVERAGE_MAX }, // 170–182cm
  { band: "tall", min: HEIGHT_BAND_AVERAGE_MAX, max: HEIGHT_BAND_TALL_MAX }, // 182–192cm
  { band: "giant", min: HEIGHT_BAND_TALL_MAX, max: HEIGHT_BAND_GIANT_MAX }, // 192–200cm
  { band: "towering", min: HEIGHT_BAND_GIANT_MAX, max: Infinity }, // 200cm+
];
