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

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

// === Stat Descriptor Bands (0–100 attributes) ===

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

export function toStatBand(value: number, prev?: StatBand): StatBand {
  return toBand(value, STAT_BANDS, prev);
}

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

export type ConditionBand = "peak" | "good" | "fair" | "worn" | "fragile";

export const CONDITION_BANDS: BandDef<ConditionBand>[] = [
  { band: "fragile", min: 0, max: 30 },
  { band: "worn", min: 30, max: 50 },
  { band: "fair", min: 50, max: 70 },
  { band: "good", min: 70, max: 90 },
  { band: "peak", min: 90, max: Infinity },
];

export function toConditionBand(value: number, prev?: ConditionBand): ConditionBand {
  return toBand(value, CONDITION_BANDS, prev);
}

export const CONDITION_LABELS: Record<ConditionBand, { label: string; description: string }> = {
  peak: { label: "Peak", description: "In supreme physical condition." },
  good: { label: "Good", description: "Moving well, no visible concerns." },
  fair: { label: "Fair", description: "Showing some wear; managing carefully." },
  worn: { label: "Worn", description: "Visibly fatigued; needs rest." },
  fragile: { label: "Fragile", description: "Body breaking down; high injury risk." },
};

// === Fatigue Bands ===

export type FatigueBand = "fresh" | "light" | "tired" | "exhausted" | "spent";

export const FATIGUE_BANDS: BandDef<FatigueBand>[] = [
  { band: "fresh", min: 0, max: 15 },
  { band: "light", min: 15, max: 35 },
  { band: "tired", min: 35, max: 55 },
  { band: "exhausted", min: 55, max: 75 },
  { band: "spent", min: 75, max: Infinity },
];

export function toFatigueBand(value: number, prev?: FatigueBand): FatigueBand {
  return toBand(value, FATIGUE_BANDS, prev);
}

export const FATIGUE_LABELS: Record<FatigueBand, string> = {
  fresh: "Fresh",
  light: "Lightly Worn",
  tired: "Tired",
  exhausted: "Exhausted",
  spent: "Spent",
};

// === Momentum Bands ===

export type MomentumBand = "on_fire" | "rising" | "steady" | "struggling" | "in_crisis";

export function toMomentumBand(momentum: number): MomentumBand {
  // Momentum typically stored as -5..+5 or 0..100
  const v = Math.abs(momentum) > 10
    ? (clamp(momentum, 0, 100) - 50) / 10
    : clamp(momentum, -5, 5);
  if (v >= 3) return "on_fire";
  if (v >= 1) return "rising";
  if (v <= -3) return "in_crisis";
  if (v <= -1) return "struggling";
  return "steady";
}

export const MOMENTUM_LABELS: Record<MomentumBand, string> = {
  on_fire: "On Fire",
  rising: "Rising",
  steady: "Steady",
  struggling: "Struggling",
  in_crisis: "In Crisis",
};

// === Financial Bands (derived from runway weeks, NOT raw yen) ===

export type FinancialBand = "secure" | "comfortable" | "tight" | "critical" | "desperate";

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

export type RivalryHeatBand = "dormant" | "simmering" | "heated" | "fierce" | "legendary";

export const RIVALRY_HEAT_BANDS: BandDef<RivalryHeatBand>[] = [
  { band: "dormant", min: 0, max: 20 },
  { band: "simmering", min: 20, max: 40 },
  { band: "heated", min: 40, max: 65 },
  { band: "fierce", min: 65, max: 85 },
  { band: "legendary", min: 85, max: Infinity },
];

export function toRivalryHeatBand(heat: number, prev?: RivalryHeatBand): RivalryHeatBand {
  return toBand(heat, RIVALRY_HEAT_BANDS, prev);
}

export const RIVALRY_HEAT_LABELS: Record<RivalryHeatBand, string> = {
  dormant: "Dormant",
  simmering: "Simmering",
  heated: "Heated",
  fierce: "Fierce",
  legendary: "Legendary",
};

// === Oyakata Trait Bands ===

export type TraitBand = "extreme" | "high" | "moderate" | "low" | "minimal";

export const TRAIT_BANDS: BandDef<TraitBand>[] = [
  { band: "minimal", min: 0, max: 20 },
  { band: "low", min: 20, max: 40 },
  { band: "moderate", min: 40, max: 60 },
  { band: "high", min: 60, max: 80 },
  { band: "extreme", min: 80, max: Infinity },
];

export function toTraitBand(value: number, prev?: TraitBand): TraitBand {
  return toBand(value, TRAIT_BANDS, prev);
}

export const TRAIT_LABELS: Record<TraitBand, string> = {
  extreme: "Extreme",
  high: "High",
  moderate: "Moderate",
  low: "Low",
  minimal: "Minimal",
};

// === Win Rate Assessment (public-facing record context) ===

export type WinRateAssessment = "dominant" | "strong" | "competitive" | "struggling" | "in_trouble";

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

export const WIN_RATE_LABELS: Record<WinRateAssessment, string> = {
  dominant: "Dominant",
  strong: "Strong",
  competitive: "Competitive",
  struggling: "Struggling",
  in_trouble: "In Trouble",
};

// === Prize / Currency Bands (never show raw ¥) ===

export type PrizeBand = "grand" | "substantial" | "modest" | "small" | "token";

export function toPrizeBand(amountYen: number): PrizeBand {
  if (amountYen >= 30_000_000) return "grand";
  if (amountYen >= 10_000_000) return "substantial";
  if (amountYen >= 3_000_000) return "modest";
  if (amountYen >= 500_000) return "small";
  return "token";
}

export const PRIZE_LABELS: Record<PrizeBand, string> = {
  grand: "Grand Prize",
  substantial: "Substantial",
  modest: "Modest",
  small: "Small",
  token: "Token",
};

// === Scandal Score Bands ===

export type ScandalBand = "clean" | "whispers" | "scrutiny" | "scandal" | "crisis";

export const SCANDAL_BANDS: BandDef<ScandalBand>[] = [
  { band: "clean", min: 0, max: 10 },
  { band: "whispers", min: 10, max: 30 },
  { band: "scrutiny", min: 30, max: 55 },
  { band: "scandal", min: 55, max: 80 },
  { band: "crisis", min: 80, max: Infinity },
];

export function toScandalBand(score: number, prev?: ScandalBand): ScandalBand {
  return toBand(score, SCANDAL_BANDS, prev);
}

export const SCANDAL_LABELS: Record<ScandalBand, string> = {
  clean: "Clean",
  whispers: "Whispers",
  scrutiny: "Under Scrutiny",
  scandal: "Scandal",
  crisis: "Crisis",
};

// === Aggregated Rikishi Descriptor (for UI cards) ===

export interface RikishiDescriptor {
  powerBand: StatBand;
  speedBand: StatBand;
  balanceBand: StatBand;
  techniqueBand: StatBand;
  conditionBand: ConditionBand;
  fatigueBand: FatigueBand;
  momentumBand: MomentumBand;
}

export function toRikishiDescriptor(r: {
  power: number;
  speed: number;
  balance: number;
  technique: number;
  condition: number;
  fatigue: number;
  momentum: number;
}, prev?: Partial<RikishiDescriptor>): RikishiDescriptor {
  return {
    powerBand: toStatBand(r.power, prev?.powerBand),
    speedBand: toStatBand(r.speed, prev?.speedBand),
    balanceBand: toStatBand(r.balance, prev?.balanceBand),
    techniqueBand: toStatBand(r.technique, prev?.techniqueBand),
    conditionBand: toConditionBand(r.condition, prev?.conditionBand),
    fatigueBand: toFatigueBand(r.fatigue, prev?.fatigueBand),
    momentumBand: toMomentumBand(r.momentum),
  };
}
