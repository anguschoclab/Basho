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
import { BardEngine } from "../../bard/BardEngine";
import {
  type ConfidenceLevel,
  type ScoutingInvestment,
  type ScoutingAttributeType,
  INVESTMENT_BONUS,
} from "../../../constants/engine/recruitment";
import {
  MAX_SCOUTING_LEVEL,
  PASSIVE_SCOUTING_MAX_BASE,
  PASSIVE_SCOUTING_MULTIPLIER,
  FOG_OF_WAR_CERTAIN_THRESHOLD,
  FOG_OF_WAR_HIGH_THRESHOLD,
  FOG_OF_WAR_MEDIUM_THRESHOLD,
  FOG_OF_WAR_LOW_THRESHOLD,
  STYLE_HIGH_OBSERVATIONS,
  STYLE_MEDIUM_OBSERVATIONS,
  POTENTIAL_HIGH_THRESHOLD,
  POTENTIAL_MEDIUM_THRESHOLD,
  POTENTIAL_LOW_THRESHOLD,
  FOG_OF_WAR_ERROR_RANGE_LOW,
  FOG_OF_WAR_ERROR_RANGE_MEDIUM,
  HIGH_ERROR_PERCENTAGE,
  FOG_OF_WAR_PROBABILITY_THRESHOLD,
  SCOUTING_BIAS_MAX,
  SCOUTING_BIAS_DECAY_OBSERVATIONS,
  FULL_BIAS_FACTOR,
} from "../../../constants/engine/recruitmentExtended";

/**
 * Calculate numerical scouting level (0-100).
 */
export function calculateScoutingLevel(
  isOwned: boolean,
  observations: number,
  investment: ScoutingInvestment
): number {
  if (isOwned) return MAX_SCOUTING_LEVEL;
  const passiveBase = Math.min(
    PASSIVE_SCOUTING_MAX_BASE,
    Math.max(0, observations) * PASSIVE_SCOUTING_MULTIPLIER
  );
  return clampInt(passiveBase + (INVESTMENT_BONUS[investment] || 0), 0, MAX_SCOUTING_LEVEL);
}

/**
 * Determine qualitative confidence from numerical level.
 */
export function getConfidenceFromLevel(level: number): ConfidenceLevel {
  if (level >= FOG_OF_WAR_CERTAIN_THRESHOLD) return "certain";
  if (level >= FOG_OF_WAR_HIGH_THRESHOLD) return "high";
  if (level >= FOG_OF_WAR_MEDIUM_THRESHOLD) return "medium";
  if (level >= FOG_OF_WAR_LOW_THRESHOLD) return "low";
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
    if (observations >= STYLE_HIGH_OBSERVATIONS) return "high";
    if (observations >= STYLE_MEDIUM_OBSERVATIONS) return "medium";
    return "low";
  }

  if (attributeType === "potential") {
    // Potential is harder to scout than current ability — shift confidence down one tier.
    if (level >= POTENTIAL_HIGH_THRESHOLD) return "high";
    if (level >= POTENTIAL_MEDIUM_THRESHOLD) return "medium";
    if (level >= POTENTIAL_LOW_THRESHOLD) return "low";
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
    low: FOG_OF_WAR_ERROR_RANGE_LOW,
    medium: FOG_OF_WAR_ERROR_RANGE_MEDIUM,
    high: HIGH_ERROR_PERCENTAGE,
  };

  const rng = rngFromSeed(seed, "scouting", "estimation");
  const rand = rng.next();
  const sign = rng.next() < FOG_OF_WAR_PROBABILITY_THRESHOLD ? -1 : 1;
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
    power: number;
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

const BIAS_MAX = SCOUTING_BIAS_MAX;
const DECAY_OBS_FULL = SCOUTING_BIAS_DECAY_OBSERVATIONS; // at this many observations, bias is fully gone

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
    "power",
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
    const sign = rng.next() < FOG_OF_WAR_PROBABILITY_THRESHOLD ? -1 : 1;
    statOffsets[key] = magnitude * sign;
  }
  return { statOffsets, decayFactor: FULL_BIAS_FACTOR };
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
