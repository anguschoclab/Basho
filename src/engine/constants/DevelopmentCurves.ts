/**
 * Development curves and potential-ability tables for rikishi lifecycle.
 *
 * Models how Current Ability (CA) approaches Potential Ability (PA) with age,
 * and how physical size develops over a career. All values tunable here —
 * the engine reads them as data.
 */

import type { Rank } from "../types/banzuke";

export type DevelopmentProfile =
  | "prodigy"
  | "standard"
  | "late_bloomer"
  | "journeyman"
  | "early_peaker";

export type AttributeGroup = "size_height" | "size_weight" | "physical" | "technical" | "mental";

/** Weighted picker for development profile at generation. */
export const DEVELOPMENT_PROFILE_WEIGHTS: Record<DevelopmentProfile, number> = {
  prodigy: 0.05,
  standard: 0.65,
  late_bloomer: 0.15,
  journeyman: 0.1,
  early_peaker: 0.05,
};

/** Preset modifiers per profile. Underlying system is continuous. */
export const PROFILE_PRESETS: Record<
  DevelopmentProfile,
  { developmentSpeed: number; peakAgeOffset: number; ceilingFraction: number }
> = {
  // ceilingFraction = max fraction of PA actually reachable (journeymen never max out)
  prodigy: { developmentSpeed: 1.4, peakAgeOffset: -3, ceilingFraction: 1.0 },
  standard: { developmentSpeed: 1.0, peakAgeOffset: 0, ceilingFraction: 1.0 },
  late_bloomer: { developmentSpeed: 0.75, peakAgeOffset: 2, ceilingFraction: 1.0 },
  journeyman: { developmentSpeed: 0.7, peakAgeOffset: 0, ceilingFraction: 0.75 },
  early_peaker: { developmentSpeed: 1.35, peakAgeOffset: -4, ceilingFraction: 0.9 },
};

/**
 * Peak ages per attribute group. Speed peaks early, mental late.
 * `rise` = years from debut-age (15) to peak; `fall` = years past peak to age-40 floor.
 */
export const ATTRIBUTE_PEAK: Record<
  AttributeGroup,
  { peakAge: number; riseYears: number; declinePerYear: number; earlyFraction: number }
> = {
  // earlyFraction = fraction of PA expressed at age 15 (before development)
  size_height: { peakAge: 19, riseYears: 4, declinePerYear: 0.0, earlyFraction: 0.88 },
  size_weight: { peakAge: 27, riseYears: 12, declinePerYear: 0.005, earlyFraction: 0.55 },
  physical: { peakAge: 26, riseYears: 11, declinePerYear: 0.02, earlyFraction: 0.6 },
  technical: { peakAge: 30, riseYears: 15, declinePerYear: 0.01, earlyFraction: 0.5 },
  mental: { peakAge: 32, riseYears: 17, declinePerYear: 0.008, earlyFraction: 0.45 },
};

/** Which attribute group each RikishiStats key belongs to. */
export const STAT_GROUP: Record<
  "strength" | "speed" | "stamina" | "technique" | "balance" | "adaptability" | "mental",
  AttributeGroup
> = {
  strength: "physical",
  speed: "physical",
  stamina: "physical",
  technique: "technical",
  balance: "technical",
  adaptability: "technical",
  mental: "mental",
};

/**
 * PA distribution by rank. Mean and σ — biased high for top ranks but with
 * fat-tail sampling to allow sleeper makushita with ozeki-level PA, and
 * maegashira plateauing below their potential.
 */
export const PA_BY_RANK: Record<Rank, { mean: number; stdDev: number }> = {
  yokozuna: { mean: 88, stdDev: 5 },
  ozeki: { mean: 82, stdDev: 6 },
  sekiwake: { mean: 76, stdDev: 7 },
  komusubi: { mean: 72, stdDev: 7 },
  maegashira: { mean: 62, stdDev: 9 },
  juryo: { mean: 54, stdDev: 9 },
  makushita: { mean: 46, stdDev: 10 },
  sandanme: { mean: 40, stdDev: 10 },
  jonidan: { mean: 35, stdDev: 10 },
  jonokuchi: { mean: 32, stdDev: 10 },
};

/** Age distribution by rank — Gaussian, biased but not hard-gated. */
export const AGE_BY_RANK: Record<Rank, { mean: number; stdDev: number; min: number; max: number }> =
  {
    yokozuna: { mean: 29, stdDev: 3.5, min: 20, max: 34 },
    ozeki: { mean: 27, stdDev: 3.5, min: 20, max: 32 },
    sekiwake: { mean: 26, stdDev: 3, min: 19, max: 31 },
    komusubi: { mean: 25, stdDev: 3, min: 19, max: 30 },
    maegashira: { mean: 26, stdDev: 4, min: 18, max: 31 },
    juryo: { mean: 24, stdDev: 3.5, min: 17, max: 29 },
    makushita: { mean: 22, stdDev: 3, min: 16, max: 27 },
    sandanme: { mean: 20, stdDev: 2.5, min: 15, max: 25 },
    jonidan: { mean: 18, stdDev: 2, min: 15, max: 23 },
    jonokuchi: { mean: 17, stdDev: 1.5, min: 15, max: 21 },
  };

/** Size potential ranges (post-maturity ceiling). */
export const SIZE_POTENTIAL = {
  heightCm: { mean: 183, stdDev: 7, min: 165, max: 208 },
  weightKg: { mean: 155, stdDev: 22, min: 95, max: 230 },
};

/**
 * Returns a 0–1 maturity multiplier for a given attribute group at a given age.
 * Applied as: CA = PA * ceilingFraction * maturity(age, group).
 *
 * Shape: earlyFraction at age 15 → 1.0 at peakAge (shifted by peakAgeOffset) →
 * declining past peak. Development speed stretches/compresses the rise phase.
 */
export function maturityFactor(args: {
  age: number;
  group: AttributeGroup;
  developmentSpeed: number;
  peakAgeOffset: number;
}): number {
  const { age, group, developmentSpeed, peakAgeOffset } = args;
  const curve = ATTRIBUTE_PEAK[group];
  const effectivePeak = curve.peakAge + peakAgeOffset;
  const debutAge = 15;

  if (age <= debutAge) return curve.earlyFraction;

  if (age <= effectivePeak) {
    // Smooth rise from earlyFraction → 1.0
    const effectiveRise = curve.riseYears / developmentSpeed;
    const progress = Math.min(1, (age - debutAge) / effectiveRise);
    // Ease-out curve: sqrt gives fast early growth, slower near peak
    const eased = Math.sqrt(progress);
    return curve.earlyFraction + (1 - curve.earlyFraction) * eased;
  }

  // Decline phase
  const yearsPastPeak = age - effectivePeak;
  const declined = 1 - yearsPastPeak * curve.declinePerYear;
  return Math.max(0.4, declined);
}
