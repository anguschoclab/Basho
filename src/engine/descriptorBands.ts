import { clamp } from './utils';
// descriptorBands.ts
// =======================================================
// No-Leak Observability Layer (Constitution A7.1)
// Translates raw engine numbers into qualitative bands.
// UI components MUST use these bands—never raw values.
//
// Hysteresis: hysteresisDelta = 5 prevents band flickering
// when a stat sits on a boundary.
// =======================================================

// === Hysteresis Engine ===

/**
 * Generic banded descriptor with hysteresis.
 * Each band has a [min, max) range. The hysteresis delta prevents
 * flicker when a value oscillates near a boundary.
 *
 * Usage:
 *   const band = toBand(value, POWER_BANDS, previousBand);
 */

export const HYSTERESIS_DELTA = 5;

/** Defines the structure for band def. */
export interface BandDef<T extends string> {
  band: T;
  min: number; // inclusive
  max: number; // exclusive (use Infinity for top band)
}

/**
 * Resolve a raw value to a qualitative band with hysteresis.
 * If `previousBand` is provided and the value is within HYSTERESIS_DELTA
 * of the boundary, we stick with the previous band.
 */
export function toBand<T extends string>(
  value: number,
  bands: BandDef<T>[],
  previousBand?: T
): T {
  const v = clamp(value, 0, 100);

  // Find the band this value falls into
  const resolved = bands.find(b => v >= b.min && v < b.max) ?? bands[bands.length - 1];

  if (!previousBand || previousBand === resolved.band) return resolved.band;

  // Hysteresis: if we're within delta of the boundary between previous and new band,
  // stick with previous
  const prevDef = bands.find(b => b.band === previousBand);
  if (!prevDef) return resolved.band;

  // Check if value is near the boundary between prev and resolved
  if (prevDef.min > resolved.min) {
    // Moving down: check if within delta of prevDef.min
    if (v >= prevDef.min - HYSTERESIS_DELTA) return previousBand;
  } else {
    // Moving up: check if within delta of prevDef.max
    if (v < prevDef.max + HYSTERESIS_DELTA) return previousBand;
  }

  return resolved.band;
}



// === Stat Descriptor Bands (0–100 attributes) ===

/** Type representing stat band. */
export type StatBand = "exceptional" | "outstanding" | "strong" | "capable" | "developing" | "limited" | "struggling";

/** s t a t_ b a n d s. */
export const STAT_BANDS: BandDef<StatBand>[] = [
  { band: "struggling", min: 0, max: 15 },
  { band: "limited", min: 15, max: 30 },
  { band: "developing", min: 30, max: 45 },
  { band: "capable", min: 45, max: 60 },
  { band: "strong", min: 60, max: 75 },
  { band: "outstanding", min: 75, max: 90 },
  { band: "exceptional", min: 90, max: Infinity },
];

/**
 * To stat band.
 *  * @param value - The Value.
 *  * @param prev - The Prev.
 *  * @returns The result.
 */
export function toStatBand(value: number, prev?: StatBand): StatBand {
  return toBand(value, STAT_BANDS, prev);
}

/**
 * Generic descriptor band (alias for toStatBand) for generic 0-100 attributes.
 */
export function toDescriptorBand(value: number, prev?: StatBand): StatBand {
  return toStatBand(value, prev);
}

/** s t a t_ b a n d_ l a b e l s. */
export const STAT_BAND_LABELS: Record<StatBand, string> = {
  exceptional: "Exceptional",
  outstanding: "Outstanding",
  strong: "Strong",
  capable: "Capable",
  developing: "Developing",
  limited: "Limited",
  struggling: "Struggling",
};

// === Condition / Health Bands ===

/** Type representing condition band. */
export type ConditionBand = "peak" | "good" | "fair" | "worn" | "fragile";

/** c o n d i t i o n_ b a n d s. */
export const CONDITION_BANDS: BandDef<ConditionBand>[] = [
  { band: "fragile", min: 0, max: 30 },
  { band: "worn", min: 30, max: 50 },
  { band: "fair", min: 50, max: 70 },
  { band: "good", min: 70, max: 90 },
  { band: "peak", min: 90, max: Infinity },
];

/**
 * To condition band.
 *  * @param value - The Value.
 *  * @param prev - The Prev.
 *  * @returns The result.
 */
export function toConditionBand(value: number, prev?: ConditionBand): ConditionBand {
  return toBand(value, CONDITION_BANDS, prev);
}

/** c o n d i t i o n_ l a b e l s. */
export const CONDITION_LABELS: Record<ConditionBand, { label: string; description: string }> = {
  peak: { label: "Peak", description: "In supreme physical condition." },
  good: { label: "Good", description: "Moving well, no visible concerns." },
  fair: { label: "Fair", description: "Showing some wear; managing carefully." },
  worn: { label: "Worn", description: "Visibly fatigued; needs rest." },
  fragile: { label: "Fragile", description: "Body breaking down; high injury risk." },
};

// === Fatigue Bands ===

/** Type representing fatigue band. */
export type FatigueBand = "fresh" | "light" | "tired" | "exhausted" | "spent";

/** f a t i g u e_ b a n d s. */
export const FATIGUE_BANDS: BandDef<FatigueBand>[] = [
  { band: "fresh", min: 0, max: 15 },
  { band: "light", min: 15, max: 35 },
  { band: "tired", min: 35, max: 55 },
  { band: "exhausted", min: 55, max: 75 },
  { band: "spent", min: 75, max: Infinity },
];

/**
 * To fatigue band.
 *  * @param value - The Value.
 *  * @param prev - The Prev.
 *  * @returns The result.
 */
export function toFatigueBand(value: number, prev?: FatigueBand): FatigueBand {
  return toBand(value, FATIGUE_BANDS, prev);
}

/** f a t i g u e_ l a b e l s. */
export const FATIGUE_LABELS: Record<FatigueBand, string> = {
  fresh: "Fresh",
  light: "Lightly Worn",
  tired: "Tired",
  exhausted: "Exhausted",
  spent: "Spent",
};


// === Motivation Bands ===

export type MotivationBand = "driven" | "eager" | "content" | "distracted" | "apathetic";

export const MOTIVATION_LABELS: Record<MotivationBand, string> = {
  driven: "Driven",
  eager: "Eager",
  content: "Content",
  distracted: "Distracted",
  apathetic: "Apathetic"
};

/**
 * To motivation band.
 *  * @param value - The value.
 *  * @param prev - The previous band.
 *  * @returns The result.
 */
export function toMotivationBand(value: number, prev?: MotivationBand): MotivationBand {
  const bands: BandDef<MotivationBand>[] = [
    { band: "apathetic", min: 0, max: 20 },
    { band: "distracted", min: 20, max: 40 },
    { band: "content", min: 40, max: 65 },
    { band: "eager", min: 65, max: 85 },
    { band: "driven", min: 85, max: Infinity },
  ];
  return toBand(value, bands, prev);
}


// === Momentum Bands ===

/** Type representing momentum band. */
export type MomentumBand = "on_fire" | "rising" | "steady" | "struggling" | "in_crisis";

/**
 * To momentum band.
 *  * @param momentum - The Momentum.
 *  * @returns The result.
 */
export function toMomentumBand(momentum: number, prev?: MomentumBand): MomentumBand {
  // Momentum typically stored as -5..+5 or 0..100
  const v = Math.abs(momentum) > 10
    ? (clamp(momentum, 0, 100) - 50) / 10
    : clamp(momentum, -5, 5);
  // Map the v values into pseudo-bands for hysteresis logic
  const v100 = (v + 5) * 10; // Maps -5..5 to 0..100
  const MOMENTUM_BANDS_DEF: BandDef<MomentumBand>[] = [
    { band: "in_crisis", min: 0, max: 30 }, // v <= -3 -> v100 <= 20 (roughly)
    { band: "struggling", min: 30, max: 45 }, // v <= -1 -> v100 <= 40
    { band: "steady", min: 45, max: 60 }, // v = 0 -> v100 = 50
    { band: "rising", min: 60, max: 80 }, // v >= 1 -> v100 >= 60
    { band: "on_fire", min: 80, max: Infinity }, // v >= 3 -> v100 >= 80
  ];
  return toBand(v100, MOMENTUM_BANDS_DEF, prev);
}

/** m o m e n t u m_ l a b e l s. */
export const MOMENTUM_LABELS: Record<MomentumBand, string> = {
  on_fire: "On Fire",
  rising: "Rising",
  steady: "Steady",
  struggling: "Struggling",
  in_crisis: "In Crisis",
};

// === Financial Bands (derived from runway weeks, NOT raw yen) ===

/** Type representing financial band. */
export type FinancialBand = "secure" | "comfortable" | "tight" | "critical" | "desperate";

/**
 * To financial band.
 *  * @param funds - The Funds.
 *  * @param weeklyBurn - The Weekly burn.
 *  * @returns The result.
 */
export function toFinancialBand(funds: number, weeklyBurn: number): FinancialBand {
  if (weeklyBurn <= 0) return "secure";
  const runwayWeeks = funds / weeklyBurn;
  if (runwayWeeks >= 52) return "secure";
  if (runwayWeeks >= 26) return "comfortable";
  if (runwayWeeks >= 12) return "tight";
  if (runwayWeeks >= 4) return "critical";
  return "desperate";
}

// === Rivalry Heat Bands ===

/** Type representing rivalry heat band. */
export type RivalryHeatBand = "dormant" | "simmering" | "heated" | "fierce" | "legendary";

/** r i v a l r y_ h e a t_ b a n d s. */
export const RIVALRY_HEAT_BANDS: BandDef<RivalryHeatBand>[] = [
  { band: "dormant", min: 0, max: 20 },
  { band: "simmering", min: 20, max: 40 },
  { band: "heated", min: 40, max: 65 },
  { band: "fierce", min: 65, max: 85 },
  { band: "legendary", min: 85, max: Infinity },
];

/**
 * To rivalry heat band.
 *  * @param heat - The Heat.
 *  * @param prev - The Prev.
 *  * @returns The result.
 */
export function toRivalryHeatBand(heat: number, prev?: RivalryHeatBand): RivalryHeatBand {
  return toBand(heat, RIVALRY_HEAT_BANDS, prev);
}

/** r i v a l r y_ h e a t_ l a b e l s. */
export const RIVALRY_HEAT_LABELS: Record<RivalryHeatBand, string> = {
  dormant: "Dormant",
  simmering: "Simmering",
  heated: "Heated",
  fierce: "Fierce",
  legendary: "Legendary",
};

// === Satisfaction Bands ===

/** Type representing satisfaction band. */
export type SatisfactionBand = "thrilled" | "happy" | "content" | "concerned" | "unhappy";

/** s a t i s f a c t i o n_ b a n d s. */
export const SATISFACTION_BANDS: BandDef<SatisfactionBand>[] = [
  { band: "unhappy", min: 0, max: 20 },
  { band: "concerned", min: 20, max: 40 },
  { band: "content", min: 40, max: 60 },
  { band: "happy", min: 60, max: 80 },
  { band: "thrilled", min: 80, max: Infinity },
];

/**
 * To satisfaction band.
 *  * @param satisfaction - The Satisfaction.
 *  * @param prev - The Prev.
 *  * @returns The result.
 */
export function toSatisfactionBand(satisfaction: number, prev?: SatisfactionBand): SatisfactionBand {
  return toBand(satisfaction, SATISFACTION_BANDS, prev);
}

/** s a t i s f a c t i o n_ l a b e l s. */
export const SATISFACTION_LABELS: Record<SatisfactionBand, string> = {
  thrilled: "Thrilled",
  happy: "Happy",
  content: "Content",
  concerned: "Concerned",
  unhappy: "Unhappy",
};

// === Oyakata Trait Bands ===

/** Type representing trait band. */
export type TraitBand = "extreme" | "high" | "moderate" | "low" | "minimal";

/** t r a i t_ b a n d s. */
export const TRAIT_BANDS: BandDef<TraitBand>[] = [
  { band: "minimal", min: 0, max: 20 },
  { band: "low", min: 20, max: 40 },
  { band: "moderate", min: 40, max: 60 },
  { band: "high", min: 60, max: 80 },
  { band: "extreme", min: 80, max: Infinity },
];

/**
 * To trait band.
 *  * @param value - The Value.
 *  * @param prev - The Prev.
 *  * @returns The result.
 */
export function toTraitBand(value: number, prev?: TraitBand): TraitBand {
  return toBand(value, TRAIT_BANDS, prev);
}

/** t r a i t_ l a b e l s. */
export const TRAIT_LABELS: Record<TraitBand, string> = {
  extreme: "Extreme",
  high: "High",
  moderate: "Moderate",
  low: "Low",
  minimal: "Minimal",
};

// === Win Rate Assessment (public-facing record context) ===

/** Type representing win rate assessment. */
export type WinRateAssessment = "dominant" | "strong" | "competitive" | "struggling" | "in_trouble";

/**
 * To win rate assessment.
 *  * @param wins - The Wins.
 *  * @param losses - The Losses.
 *  * @returns The result.
 */
export function toWinRateAssessment(wins: number, losses: number): WinRateAssessment {
  const total = wins + losses;
  if (total === 0) return "competitive";
  const rate = wins / total;
  if (rate >= 0.8) return "dominant";
  if (rate >= 0.6) return "strong";
  if (rate >= 0.5) return "competitive";
  if (rate >= 0.4) return "struggling";
  return "in_trouble";
}

/** w i n_ r a t e_ l a b e l s. */
export const WIN_RATE_LABELS: Record<WinRateAssessment, string> = {
  dominant: "Dominant",
  strong: "Strong",
  competitive: "Competitive",
  struggling: "Struggling",
  in_trouble: "In Trouble",
};

// === Prize / Currency Bands (never show raw ¥) ===

/** Type representing prize band. */
export type PrizeBand = "grand" | "substantial" | "modest" | "small" | "token";

/**
 * To prize band.
 *  * @param amountYen - The Amount yen.
 *  * @returns The result.
 */
export function toPrizeBand(amountYen: number): PrizeBand {
  if (amountYen >= 30_000_000) return "grand";
  if (amountYen >= 10_000_000) return "substantial";
  if (amountYen >= 3_000_000) return "modest";
  if (amountYen >= 500_000) return "small";
  return "token";
}

/** p r i z e_ l a b e l s. */
export const PRIZE_LABELS: Record<PrizeBand, string> = {
  grand: "Grand Prize",
  substantial: "Substantial",
  modest: "Modest",
  small: "Small",
  token: "Token",
};

// === Scandal Score Bands ===

/** Type representing scandal band. */
export type ScandalBand = "clean" | "whispers" | "scrutiny" | "scandal" | "crisis";

/** s c a n d a l_ b a n d s. */
export const SCANDAL_BANDS: BandDef<ScandalBand>[] = [
  { band: "clean", min: 0, max: 10 },
  { band: "whispers", min: 10, max: 30 },
  { band: "scrutiny", min: 30, max: 55 },
  { band: "scandal", min: 55, max: 80 },
  { band: "crisis", min: 80, max: Infinity },
];

/**
 * To scandal band.
 *  * @param score - The Score.
 *  * @param prev - The Prev.
 *  * @returns The result.
 */
export function toScandalBand(score: number, prev?: ScandalBand): ScandalBand {
  return toBand(score, SCANDAL_BANDS, prev);
}

/** s c a n d a l_ l a b e l s. */
export const SCANDAL_LABELS: Record<ScandalBand, string> = {
  clean: "Clean",
  whispers: "Whispers",
  scrutiny: "Under Scrutiny",
  scandal: "Scandal",
  crisis: "Crisis",
};

// === Potential / Growth Trajectory Band ===

/** Type representing potential band. */
export type PotentialBand = "generational" | "star" | "solid" | "average" | "limited" | "unknown";

/** p o t e n t i a l_ b a n d s. */
export const POTENTIAL_BANDS: BandDef<PotentialBand>[] = [
  { band: "generational", min: 88, max: 100 },
  { band: "star",         min: 72, max: 87 },
  { band: "solid",        min: 55, max: 71 },
  { band: "average",      min: 35, max: 54 },
  { band: "limited",      min: 0,  max: 34 },
];

/**
 * To potential band.
 *  * @param talentSeed - The Talent seed.
 *  * @param prev - The Prev.
 *  * @returns The result.
 */
export function toPotentialBand(talentSeed: number | undefined, prev?: PotentialBand): PotentialBand {
  if (talentSeed == null) return "unknown";
  return toBand(talentSeed, POTENTIAL_BANDS, prev) ?? "unknown";
}

// === Injury Severity Bands ===

export type InjurySeverityBand = "minor" | "moderate" | "serious" | "unknown";

export const INJURY_SEVERITY_BANDS: BandDef<InjurySeverityBand>[] = [
  { band: "minor", min: 0, max: 30 },
  { band: "moderate", min: 30, max: 70 },
  { band: "serious", min: 70, max: Infinity },
];

export function toInjurySeverityBand(severity: number | string | undefined, prev?: InjurySeverityBand): InjurySeverityBand {
  if (severity == null) return "unknown";
  if (typeof severity === "string") {
    const s = severity.toLowerCase();
    if (s === "minor" || s === "moderate" || s === "serious") return s as InjurySeverityBand;
    return "unknown";
  }
  return toBand(severity, INJURY_SEVERITY_BANDS, prev) ?? "unknown";
}

/** p o t e n t i a l_ l a b e l s. */
export const POTENTIAL_LABELS: Record<PotentialBand, { label: string; description: string }> = {
  generational: { label: "Generational Talent", description: "A once-in-a-decade prospect with limitless ceiling." },
  star:         { label: "Star Potential",       description: "Could reach the very top with proper development." },
  solid:        { label: "Solid Prospect",       description: "Reliable growth trajectory with a respectable ceiling." },
  average:      { label: "Average Ceiling",      description: "Moderate potential — hard work can compensate." },
  limited:      { label: "Limited Upside",        description: "Growth ceiling is low, but grit may surprise." },
  unknown:      { label: "Uncharted",             description: "Potential has not yet been assessed." },
};

// === Aggregated Rikishi Descriptor (for UI cards) ===

/** Defines the structure for rikishi descriptor. */
export interface RikishiDescriptor {
  powerBand: StatBand;
  speedBand: StatBand;
  balanceBand: StatBand;
  techniqueBand: StatBand;
  conditionBand: ConditionBand;
  fatigueBand: FatigueBand;
  momentumBand: MomentumBand;
  potentialBand?: PotentialBand;
}

/**
 * To rikishi descriptor.
 *  * @param r - The R.
 *  * @param prev - The Prev.
 *  * @returns The result.
 */
export function toRikishiDescriptor(r: {
  power: number;
  speed: number;
  balance: number;
  technique: number;
  condition: number;
  fatigue: number;
  momentum: number;
  talentSeed?: number;
}, prev?: Partial<RikishiDescriptor>): RikishiDescriptor {
  return {
    powerBand: toStatBand(r.power, prev?.powerBand),
    speedBand: toStatBand(r.speed, prev?.speedBand),
    balanceBand: toStatBand(r.balance, prev?.balanceBand),
    techniqueBand: toStatBand(r.technique, prev?.techniqueBand),
    conditionBand: toConditionBand(r.condition, prev?.conditionBand),
    fatigueBand: toFatigueBand(r.fatigue, prev?.fatigueBand),
    momentumBand: toMomentumBand(r.momentum, prev?.momentumBand),
    potentialBand: toPotentialBand(r.talentSeed, prev?.potentialBand),
  };
}
