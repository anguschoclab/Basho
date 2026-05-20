/**
 * src/engine/systems/narrative/NarrativeService.ts
 * ================================================
 * Data-driven Narrative Service for Sumo Manager Pro.
 *
 * Responsibilities:
 * - Map numeric values to narrative bands (stat, fatigue, momentum, etc.)
 * - Provide narrative labels and prose for UI display
 * - Apply hysteresis to prevent band thrashing
 * - Resolve descriptor bands from BardEngine archive
 *
 * @see NarrativeBands for band definitions
 * @see NarrativeProse for label and prose generation
 * @see BardEngine for narrative archive resolution
 */

import { clamp } from "../../utils/math";
import { SeededRNG } from "../../rng";
import { BardEngine } from "../../narrative/BardEngine";
import type {
  BandDef,
  StatBand,
  FatigueBand,
  MomentumBand,
  PotentialBand,
  RivalryHeatBand,
  ScandalBand,
  TraitBand,
  PrizeBand,
  DescriptorBand,
  AgeBand,
  ExperienceBand,
  WeightBand,
  ReputationBand,
  InjurySeverityBand,
  WinRateBand,
  HeightBand,
} from "./NarrativeBands";
import {
  STAT_BANDS,
  FATIGUE_BANDS,
  POTENTIAL_BANDS,
  RIVALRY_HEAT_BANDS,
  SCANDAL_BANDS,
  TRAIT_BANDS,
  PRIZE_BANDS,
  CONDITION_DESCRIPTOR_BANDS,
  MORALE_DESCRIPTOR_BANDS,
  POTENTIAL_DESCRIPTOR_BANDS,
  AGE_BANDS,
  EXPERIENCE_BANDS,
  WEIGHT_BANDS,
  HEIGHT_BANDS,
  REPUTATION_BANDS,
  INJURY_SEVERITY_BANDS,
  WIN_RATE_BANDS,
} from "./NarrativeBands";
import {
  getStatLabel,
  getStatProse,
  getFatigueLabel,
  getMomentumLabel,
  getPotentialInfo,
  getArchetypeInfo,
  getRivalryHeatLabel,
  getScandalLabel,
  getPrizeLabel,
  getTraitLabel,
  getAgeLabel,
  getExperienceLabel,
  getWeightLabel,
  getHeightLabel,
  getReputationLabel,
  getInjurySeverityLabel,
  getWinRateLabel,
} from "./NarrativeProse";
import type { CombatArchetype } from "../../types/combat";

const HYSTERESIS_DELTA = 5;

/**
 * For physical measurements (height cm, weight kg) that exceed the 0–100 range.
 * Maps a numeric value to a band based on a ladder definition.
 *
 * @param {number} value - The numeric value to map.
 * @param {BandDef<T>[]} ladder - The band ladder definition.
 * @returns {T} The band identifier.
 */
function toPhysicalBand<T extends string>(value: number, ladder: BandDef<T>[]): T {
  const entry = ladder.find((b) => value >= b.min && value < b.max) ?? ladder[ladder.length - 1];
  return entry.band;
}

/**
 * Maps a numeric value to a band with hysteresis to prevent band thrashing.
 * Hysteresis ensures that small fluctuations don't cause band changes.
 *
 * @param {number} value - The numeric value to map.
 * @param {BandDef<T>[]} ladder - The band ladder definition.
 * @param {T} [lastBand] - The previous band value for hysteresis.
 * @returns {T} The band identifier with hysteresis applied.
 */
function toBandWithHysteresis<T extends string>(
  value: number,
  ladder: BandDef<T>[],
  lastBand?: T
): T {
  const v = clamp(value, 0, 100);
  const resolved = ladder.find((b) => v >= b.min && v < b.max) ?? ladder[ladder.length - 1];

  if (lastBand && lastBand !== resolved.band) {
    const prevDef = ladder.find((b) => b.band === lastBand);
    if (prevDef) {
      if (v >= prevDef.max) return resolved.band;
      if (v <= prevDef.min - HYSTERESIS_DELTA) return resolved.band;
      return lastBand;
    }
  }

  return resolved.band;
}

/**
 * Internal helper to resolve DescriptorBand strings from archive.
 * Uses BardEngine to fetch label and tooltip text for a descriptor.
 *
 * @param {SeededRNG} rng - The RNG instance for deterministic resolution.
 * @param {string} path - The archive path to resolve.
 * @param {{ id: string; colorCode: string }} entry - The descriptor entry.
 * @returns {DescriptorBand} The resolved descriptor band with label and tooltip.
 */
function resolveDescriptor(
  rng: SeededRNG,
  path: string,
  entry: { id: string; colorCode: string }
): DescriptorBand {
  const label = BardEngine.resolve(rng, `${path}.${entry.id}.label`).text;
  const tooltip = BardEngine.resolve(rng, `${path}.${entry.id}.tooltip`).text;
  return { id: entry.id, label, tooltip, colorCode: entry.colorCode };
}

/**
 * Narrative Service namespace.
 * Provides band mapping and narrative label generation for UI display.
 *
 * @example
 * ```ts
 * const statBand = NarrativeService.getStatBand(85);
 * const label = NarrativeService.getStatLabel(rng, statBand);
 * const prose = NarrativeService.describeAttribute(rng, "strength", 85);
 * ```
 */
export const NarrativeService = {
  /**
   * Get stat band from numeric value with hysteresis.
   *
   * @param {number} value - The stat value (0-100).
   * @param {StatBand} [previous] - The previous band for hysteresis.
   * @returns {StatBand} The stat band.
   */
  getStatBand(value: number, previous?: StatBand): StatBand {
    return toBandWithHysteresis(value, STAT_BANDS, previous);
  },

  /**
   * Get narrative label for a stat band.
   *
   * @param {SeededRNG} rng - The RNG instance.
   * @param {StatBand} band - The stat band.
   * @returns {string} The narrative label.
   */
  getStatLabel(rng: SeededRNG, band: StatBand): string {
    return getStatLabel(rng, band);
  },

  /**
   * Describe an attribute with narrative prose.
   *
   * @param {SeededRNG} rng - The RNG instance.
   * @param {string} attribute - The attribute name.
   * @param {number} value - The attribute value.
   * @returns {string} The narrative prose.
   */
  describeAttribute(rng: SeededRNG, attribute: string, value: number): string {
    const band = this.getStatBand(value);
    return getStatProse(rng, attribute, band);
  },

  /**
   * Get fatigue band from numeric value with hysteresis.
   *
   * @param {number} value - The fatigue value (0-100).
   * @param {FatigueBand} [previous] - The previous band for hysteresis.
   * @returns {FatigueBand} The fatigue band.
   */
  getFatigueBand(value: number, previous?: FatigueBand): FatigueBand {
    return toBandWithHysteresis(value, FATIGUE_BANDS, previous);
  },

  /**
   * Get narrative label for a fatigue band.
   *
   * @param {SeededRNG} rng - The RNG instance.
   * @param {FatigueBand} band - The fatigue band.
   * @returns {string} The narrative label.
   */
  getFatigueLabel(rng: SeededRNG, band: FatigueBand): string {
    return getFatigueLabel(rng, band);
  },

  getPotentialBand(talentSeed: number | undefined, previous?: PotentialBand): PotentialBand {
    if (talentSeed == null) return "unknown";
    return toBandWithHysteresis(talentSeed, POTENTIAL_BANDS, previous);
  },

  getPotentialInfo(rng: SeededRNG, band: PotentialBand): { label: string; description: string } {
    return getPotentialInfo(rng, band);
  },

  getMomentumBand(momentum: number): MomentumBand {
    const v =
      Math.abs(momentum) > 10 ? (clamp(momentum, 0, 100) - 50) / 10 : clamp(momentum, -5, 5);
    if (v >= 3) return "on_fire";
    if (v >= 1) return "rising";
    if (v <= -3) return "in_crisis";
    if (v <= -1) return "struggling";
    return "steady";
  },

  getMomentumLabel(rng: SeededRNG, band: MomentumBand): string {
    return getMomentumLabel(rng, band);
  },

  getRivalryHeatBand(value: number, previous?: RivalryHeatBand): RivalryHeatBand {
    return toBandWithHysteresis(value, RIVALRY_HEAT_BANDS, previous);
  },

  getRivalryHeatLabel(rng: SeededRNG, band: RivalryHeatBand): string {
    return getRivalryHeatLabel(rng, band);
  },

  getScandalBand(value: number, previous?: ScandalBand): ScandalBand {
    return toBandWithHysteresis(value, SCANDAL_BANDS, previous);
  },

  getScandalLabel(rng: SeededRNG, band: ScandalBand): string {
    return getScandalLabel(rng, band);
  },

  getTraitBand(value: number, previous?: TraitBand): TraitBand {
    return toBandWithHysteresis(value, TRAIT_BANDS, previous);
  },

  getTraitLabel(rng: SeededRNG, band: TraitBand): string {
    return getTraitLabel(rng, band);
  },

  getPrizeBand(amount: number): PrizeBand {
    const resolved = PRIZE_BANDS.find((b) => amount >= b.min && amount < b.max);
    return resolved?.band ?? PRIZE_BANDS[PRIZE_BANDS.length - 1].band;
  },

  getPrizeLabel(rng: SeededRNG, band: PrizeBand): string {
    return getPrizeLabel(rng, band);
  },

  getConditionDescriptor(rng: SeededRNG, value: number): DescriptorBand {
    const v = clamp(value, 0, 1);
    const entry =
      CONDITION_DESCRIPTOR_BANDS.find((b) => v >= b.min && v < b.max) ??
      CONDITION_DESCRIPTOR_BANDS[CONDITION_DESCRIPTOR_BANDS.length - 1];
    return resolveDescriptor(rng, "rikishi.descriptors.condition", entry);
  },

  getMoraleDescriptor(rng: SeededRNG, value: number): DescriptorBand {
    const v = clamp(value, 0, 1);
    const entry =
      MORALE_DESCRIPTOR_BANDS.find((b) => v >= b.min && v < b.max) ??
      MORALE_DESCRIPTOR_BANDS[MORALE_DESCRIPTOR_BANDS.length - 1];
    return resolveDescriptor(rng, "rikishi.descriptors.morale", entry);
  },

  getPotentialDescriptor(rng: SeededRNG, talentSeed: number): DescriptorBand {
    const v = clamp(talentSeed, 0, 100);
    const entry =
      POTENTIAL_DESCRIPTOR_BANDS.find((b) => v >= b.min && v < b.max) ??
      POTENTIAL_DESCRIPTOR_BANDS[POTENTIAL_DESCRIPTOR_BANDS.length - 1];
    return resolveDescriptor(rng, "rikishi.descriptors.potential", entry);
  },

  getArchetypeInfo(
    rng: SeededRNG,
    archetype: CombatArchetype
  ): { label: string; description: string } {
    return getArchetypeInfo(rng, archetype);
  },

  // === Age Bands ===
  getAgeBand(age: number, previous?: AgeBand): AgeBand {
    return toBandWithHysteresis(age, AGE_BANDS, previous);
  },

  getAgeLabel(rng: SeededRNG, band: AgeBand): string {
    return getAgeLabel(rng, band);
  },

  // === Experience Bands ===
  getExperienceBand(value: number, previous?: ExperienceBand): ExperienceBand {
    return toBandWithHysteresis(value, EXPERIENCE_BANDS, previous);
  },

  getExperienceLabel(rng: SeededRNG, band: ExperienceBand): string {
    return getExperienceLabel(rng, band);
  },

  // === Weight Bands ===
  getWeightBand(kg: number, _previous?: WeightBand): WeightBand {
    return toPhysicalBand(kg, WEIGHT_BANDS);
  },

  getWeightLabel(rng: SeededRNG, band: WeightBand): string {
    return getWeightLabel(rng, band);
  },

  // === Height Bands ===
  getHeightBand(cm: number, _previous?: HeightBand): HeightBand {
    return toPhysicalBand(cm, HEIGHT_BANDS);
  },

  getHeightLabel(rng: SeededRNG, band: HeightBand): string {
    return getHeightLabel(rng, band);
  },

  // === Reputation Bands ===
  getReputationBand(value: number, previous?: ReputationBand): ReputationBand {
    return toBandWithHysteresis(value, REPUTATION_BANDS, previous);
  },

  getReputationLabel(rng: SeededRNG, band: ReputationBand): string {
    return getReputationLabel(rng, band);
  },

  // === Injury Severity Bands ===
  getInjurySeverityBand(value: number, previous?: InjurySeverityBand): InjurySeverityBand {
    return toBandWithHysteresis(value, INJURY_SEVERITY_BANDS, previous);
  },

  getInjurySeverityLabel(rng: SeededRNG, band: InjurySeverityBand): string {
    return getInjurySeverityLabel(rng, band);
  },

  // === Win Rate Bands ===
  getWinRateBand(rate: number, previous?: WinRateBand): WinRateBand {
    // Convert 0-1 to 0-100 for band lookup
    const normalizedRate = rate <= 1 ? rate * 100 : rate;
    return toBandWithHysteresis(normalizedRate, WIN_RATE_BANDS, previous);
  },

  getWinRateLabel(rng: SeededRNG, band: WinRateBand): string {
    return getWinRateLabel(rng, band);
  },
};
