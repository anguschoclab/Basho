// leverageClass.ts
// Leverage Class System
// Per Constitution: Computed from physique, affects kimarite viability and physics
//
// FIXES APPLIED (compile + semantic correctness):
// - getLeverageBias previously returned MULTIPLIERS (e.g., 1.20) but your bout engine treated it like an additive bonus.
//   Now we expose BOTH:
//     - getLeverageMultiplier(...) -> returns the 0.8–1.3-ish multiplier
//     - getLeverageBiasDelta(...)  -> returns a small additive delta centered at 0 (e.g., +0.20)
// - computeLeverageClass now guards against bad inputs and makes “MobileLight” check earlier (so a light tall rikishi can be MobileLight).
// - Added deterministic mapping from Kimarite (category/class) -> leverage family so your engine can use leverage without hardcoding.
// - Added helpers for stability/mobility bonuses.
// - Kept your original API name `getLeverageBias` for backward compatibility, but clarified it returns a MULTIPLIER.
//   (If you adopt the new functions, update the bout engine to use getLeverageBiasDelta or getLeverageMultiplier explicitly.)

import type { Kimarite, KimariteClass, KimariteCategory } from "./kimarite";

export type LeverageClass =
  | "CompactAnchor"
  | "LongLever"
  | "TopHeavy"
  | "MobileLight"
  | "Standard";

export interface LeverageClassProfile {
  name: LeverageClass;
  description: string;

  // Multipliers (1.0 = neutral)
  oshiBias: number;
  yotsuBias: number;
  throwBias: number;
  tripBias: number;
  pulldownBias: number;
  reversalBias: number;

  // Flat stat bonuses (engine-space; you decide how to scale)
  stabilityBonus: number;
  mobilityBonus: number;
}

export type KimariteFamily =
  | "OSHI"
  | "YOTSU"
  | "THROW"
  | "TRIP"
  | "PULLDOWN"
  | "REVERSAL"
  | "SPECIAL";

export const LEVERAGE_PROFILES: Record<LeverageClass, LeverageClassProfile> = {
  CompactAnchor: {
    name: "CompactAnchor",
    description: "Low center of gravity, hard to move, strong base",
    oshiBias: 1.2,
    yotsuBias: 1.1,
    throwBias: 0.95,
    tripBias: 0.85,
    pulldownBias: 0.95,
    reversalBias: 0.9,
    stabilityBonus: 12,
    mobilityBonus: -5
  },
  LongLever: {
    name: "LongLever",
    description: "Tall with reach advantage, grip leverage",
    oshiBias: 0.95,
    yotsuBias: 1.2,
    throwBias: 1.2,
    tripBias: 0.95,
    pulldownBias: 0.9,
    reversalBias: 1.1,
    stabilityBonus: -3,
    mobilityBonus: 5
  },
  TopHeavy: {
    name: "TopHeavy",
    description: "High center of mass, vulnerable to trips and pulls",
    oshiBias: 1.1,
    yotsuBias: 0.95,
    throwBias: 0.9,
    tripBias: 0.8,
    pulldownBias: 1.25,
    reversalBias: 0.85,
    stabilityBonus: -8,
    mobilityBonus: 0
  },
  MobileLight: {
    name: "MobileLight",
    description: "Light and agile, excels at angles and escapes",
    oshiBias: 0.9,
    yotsuBias: 0.9,
    throwBias: 0.95,
    tripBias: 1.25,
    pulldownBias: 1.05,
    reversalBias: 1.1,
    stabilityBonus: -5,
    mobilityBonus: 15
  },
  Standard: {
    name: "Standard",
    description: "Balanced physique, no particular advantages or weaknesses",
    oshiBias: 1.0,
    yotsuBias: 1.0,
    throwBias: 1.0,
    tripBias: 1.0,
    pulldownBias: 1.0,
    reversalBias: 1.0,
    stabilityBonus: 0,
    mobilityBonus: 0
  }
};

// === INTERNAL UTILS ===
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const safe = (n: number, fallback: number) => (Number.isFinite(n) ? n : fallback);

/**
 * Compute leverage class from height (cm) and weight (kg).
 * Deterministic based on body geometry; guards against bad data.
 */
export function computeLeverageClass(height: number, weight: number): LeverageClass {
  const h = clamp(safe(height, 180), 140, 230);
  const w = clamp(safe(weight, 140), 60, 260);

  // MobileLight should be checked early so tall-but-light rikishi classify correctly.
  if (w < 120) return "MobileLight";

  const m = h / 100;
  const bmi = w / (m * m);

  const heightCategory = h < 175 ? "short" : h > 188 ? "tall" : "average";

  // Compact Anchor: short + high BMI
  if (heightCategory === "short" && bmi > 38) return "CompactAnchor";

  // Long Lever: tall + moderate BMI
  if (heightCategory === "tall" && bmi >= 28 && bmi <= 42) return "LongLever";

  // Top Heavy: tall + very high BMI
  if (heightCategory === "tall" && bmi > 42) return "TopHeavy";

  // You can extend: “average + very high BMI” could also map to CompactAnchor,
  // but keeping your original intent: Standard otherwise.
  return "Standard";
}

export function describeLeverageClass(leverageClass: LeverageClass): string {
  return LEVERAGE_PROFILES[leverageClass].description;
}

export function getStabilityBonus(leverageClass: LeverageClass): number {
  return LEVERAGE_PROFILES[leverageClass].stabilityBonus;
}

export function getMobilityBonus(leverageClass: LeverageClass): number {
  return LEVERAGE_PROFILES[leverageClass].mobilityBonus;
}

// === FAMILY MAPPING ===

/**
 * Map kimarite category/class into a leverage family used for physical bias.
 * This keeps the rest of the engine from hardcoding family logic.
 */
export function kimariteToFamily(k: Pick<Kimarite, "category" | "kimariteClass">): KimariteFamily {
  const cat: KimariteCategory = k.category;
  const cls: KimariteClass = k.kimariteClass;

  // Category-first for your registry semantics
  if (cat === "push" || cat === "thrust" || cls === "force_out" || cls === "push" || cls === "thrust") return "OSHI";
  if (cat === "throw" || cls === "throw") return "THROW";
  if (cat === "trip" || cls === "trip") return "TRIP";
  if (cat === "pull" || cls === "slap_pull" || cls === "evasion") return "PULLDOWN";
  if (cat === "lift" || cls === "lift") return "YOTSU";
  if (cat === "rear" || cls === "rear") return "SPECIAL";
  if (cat === "twist" || cls === "twist") return "REVERSAL";
  if (cat === "special" || cls === "special") return "SPECIAL";

  return "SPECIAL";
}

// === BIAS ACCESSORS ===

/**
 * Returns the MULTIPLIER for a given family (1.0 neutral).
 * This matches your profile numbers directly.
 */
export function getLeverageMultiplier(leverageClass: LeverageClass, family: KimariteFamily): number {
  const p = LEVERAGE_PROFILES[leverageClass];
  switch (family) {
    case "OSHI":
      return p.oshiBias;
    case "YOTSU":
      return p.yotsuBias;
    case "THROW":
      return p.throwBias;
    case "TRIP":
      return p.tripBias;
    case "PULLDOWN":
      return p.pulldownBias;
    case "REVERSAL":
      return p.reversalBias;
    case "SPECIAL":
      return 1.0;
  }
}

/**
 * Returns a small additive delta centered at 0.
 * Example: multiplier 1.20 -> delta +0.20; multiplier 0.85 -> delta -0.15.
 * Use this when you want “score-space” additive nudges.
 */
export function getLeverageBiasDelta(leverageClass: LeverageClass, family: KimariteFamily): number {
  return getLeverageMultiplier(leverageClass, family) - 1.0;
}

/**
 * Backward-compatible name.
 * IMPORTANT: This returns the MULTIPLIER (not delta).
 * Prefer `getLeverageMultiplier` or `getLeverageBiasDelta` in new code.
 */
export function getLeverageBias(leverageClass: LeverageClass, family: KimariteFamily): number {
  return getLeverageMultiplier(leverageClass, family);
}

/**
 * Convenience: get multiplier directly from a Kimarite object.
 */
export function getLeverageMultiplierForKimarite(leverageClass: LeverageClass, kimarite: Pick<Kimarite, "category" | "kimariteClass">): number {
  return getLeverageMultiplier(leverageClass, kimariteToFamily(kimarite));
}

/**
 * Convenience: get delta directly from a Kimarite object.
 */
export function getLeverageBiasDeltaForKimarite(leverageClass: LeverageClass, kimarite: Pick<Kimarite, "category" | "kimariteClass">): number {
  return getLeverageBiasDelta(leverageClass, kimariteToFamily(kimarite));
}
