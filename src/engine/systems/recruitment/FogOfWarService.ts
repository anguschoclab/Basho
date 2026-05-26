// @ts-nocheck
/**
 * src/engine/systems/recruitment/FogOfWarService.ts
 * =================================================
 * Pure fog of war calculation logic for Sumo Manager Pro.
 *
 * Contains deterministic algorithms for:
 * 1. Scouting Level
 * 2. Confidence Mapping
 * 3. Estimated Value (Deterministic Uncertainty)
 *
 * Goal: Decouple business rules from state management.
 */

import { clamp, clampInt } from "../../utils/math";
import { rngFromSeed, SeededRNG } from "../../rng";
import { NarrativeService } from "../narrative/NarrativeService";
import { BardEngine } from "../../narrative/BardEngine";
import {
  type ConfidenceLevel,
  type ScoutingInvestment,
  type ScoutingAttributeType,
  INVESTMENT_BONUS,
} from "../../../constants/engine/recruitment";

/**
 * Calculate numerical scouting level (0-100).
 */
export function calculateScoutingLevel(
  isOwned: boolean,
  observations: number,
  investment: ScoutingInvestment
): number {
  if (isOwned) return 100;
  const passiveBase = Math.min(30, Math.max(0, observations) * 2);
  return clampInt(passiveBase + (INVESTMENT_BONUS[investment] || 0), 0, 100);
}

/**
 * Determine qualitative confidence from numerical level.
 */
export function getConfidenceFromLevel(level: number): ConfidenceLevel {
  if (level >= 95) return "certain";
  if (level >= 70) return "high";
  if (level >= 40) return "medium";
  if (level >= 15) return "low";
  return "unknown";
}

/**
 * Determine confidence level for a specific attribute type.
 */
export function getConfidenceLevel(
  level: number,
  isOwned: boolean,
  observations: number,
  attributeType: ScoutingAttributeType
): ConfidenceLevel {
  if (isOwned) return "certain";
  if (attributeType === "physical") return "certain"; // Physical height/weight always known
  if (attributeType === "hidden") return "unknown";

  if (attributeType === "style") {
    if (observations >= 3) return "high";
    if (observations >= 1) return "medium";
    return "low";
  }

  if (attributeType === "potential") {
    // Potential is harder to scout than current ability — shift confidence down one tier.
    if (level >= 95) return "high";
    if (level >= 75) return "medium";
    if (level >= 50) return "low";
    return "unknown";
  }

  return getConfidenceFromLevel(level);
}

/**
 * Maps confidence to an estimated value with deterministic error.
 */
export function getEstimatedValue(
  trueValue: number,
  confidence: ConfidenceLevel,
  seed: string,
  range: { min: number; max: number } = { min: 0, max: 100 }
): number {
  if (confidence === "certain") return clamp(trueValue, range.min, range.max);
  if (confidence === "unknown") return (range.min + range.max) / 2;

  const maxErrorPct: Record<Exclude<ConfidenceLevel, "certain" | "unknown">, number> = {
    low: 35,
    medium: 20,
    high: 9,
  };

  const rng = rngFromSeed(seed, "scouting", "estimation");
  const rand = rng.next();
  const sign = rng.next() < 0.5 ? -1 : 1;
  const magPct = rand * maxErrorPct[confidence];

  const span = range.max - range.min;
  const error = (magPct / 100) * span * sign;

  return clamp(trueValue + error, range.min, range.max);
}

/**
 * Resolve scouted attributes into qualitative display objects.
 */
export function resolveScoutedAttribute(
  attributeName: string,
  trueValue: number,
  confidence: ConfidenceLevel,
  seed: string,
  range: { min: number; max: number } = { min: 0, max: 100 }
): { value: string; confidence: ConfidenceLevel; narrative: string } {
  const rng = new SeededRNG(seed);

  if (confidence === "unknown") {
    const { text: value } = BardEngine.resolve(rng, "scouting.confidence.unknown");
    const { text: narrative } = BardEngine.resolve(rng, "scouting.qualifiers.unknown_narrative", {
      attr: attributeName,
    });
    return { value, confidence: "unknown", narrative };
  }

  const { text: confidenceLabel } = BardEngine.resolve(rng, `scouting.confidence.${confidence}`);

  if (confidence === "certain") {
    const label = NarrativeService.describeAttribute(attributeName, trueValue);
    return { value: label, confidence: "certain", narrative: label };
  }

  const estimated = getEstimatedValue(trueValue, confidence, seed, range);
  const label = NarrativeService.describeAttribute(attributeName, estimated);

  const qKey = confidence === "medium" ? "appears" : "may_be";
  const { text: qLabel } = BardEngine.resolve(rng, `scouting.qualifiers.${qKey}`);

  const desc = `${qLabel} ${label.toLowerCase()}`;

  return { value: label, confidence, narrative: `${confidenceLabel}: ${desc}` };
}

// ============================================
// SCOUTING BIAS FUNCTIONS
// ============================================

/**
 * Persistent scouting bias that skews initial candidate stat readings.
 * Bias is generated deterministically per candidate and decays as scouting
 * observations accumulate, eventually revealing true stat values.
 */
export interface ScoutingBias {
  /**
   * True stat offsets applied when scouting level is low.
   * Range ±20 per stat. Uses TalentCandidate stat field names (strength, stamina, mental, adaptability).
   */
  statOffsets: {
    strength: number;
    speed: number;
    balance: number;
    technique: number;
    stamina: number;
    mental: number;
    adaptability: number;
  };
  /**
   * How strongly the bias still applies.
   * 1.0 = full bias (initial state), 0.0 = no bias (truth known).
   * Decays as observations accumulate.
   */
  decayFactor: number;
}

const BIAS_MAX = 20;
const DECAY_OBS_FULL = 20; // at this many observations, bias is fully gone

/**
 * Generate a seeded per-candidate scouting bias.
 * Bias is deterministic: same candidateId + year produces same bias.
 *
 * @param candidateId - Unique identifier for the candidate
 * @param year - Current year (used in seed for yearly variation)
 * @returns ScoutingBias with random stat offsets in ±20 range and full decayFactor
 */
export function generateScoutingBias(candidateId: string, year: number): ScoutingBias {
  const rng = rngFromSeed(`bias_${candidateId}_${year}`, "scouting", "bias");
  const statKeys = [
    "strength",
    "speed",
    "balance",
    "technique",
    "stamina",
    "mental",
    "adaptability",
  ] as const;
  const statOffsets = {} as ScoutingBias["statOffsets"];
  for (const key of statKeys) {
    const magnitude = Math.floor(rng.next() * BIAS_MAX);
    const sign = rng.next() < 0.5 ? -1 : 1;
    statOffsets[key] = magnitude * sign;
  }
  return { statOffsets, decayFactor: 1.0 };
}

/**
 * Apply a bias offset to a true value, scaled by decayFactor.
 * Result is clamped to valid stat range (0-99).
 *
 * @param trueValue - The actual stat value
 * @param offset - The bias offset to apply
 * @param decayFactor - How strongly bias applies (1.0 = full, 0.0 = none)
 * @returns Biased stat value clamped to 0-99
 */
export function applyBias(trueValue: number, offset: number, decayFactor: number): number {
  const scaled = Math.round(offset * decayFactor);
  return clamp(trueValue + scaled, 0, 99);
}

/**
 * Reduce decayFactor based on total observations accumulated.
 * More observations = less bias = closer to truth.
 *
 * @param bias - Current scouting bias state
 * @param totalObservations - Number of observations accumulated
 * @returns New ScoutingBias with reduced decayFactor
 */
export function decayBias(bias: ScoutingBias, totalObservations: number): ScoutingBias {
  const newDecay = clamp(1 - totalObservations / DECAY_OBS_FULL, 0, 1);
  return { ...bias, decayFactor: newDecay };
}
