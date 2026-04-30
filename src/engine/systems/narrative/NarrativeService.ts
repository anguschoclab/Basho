/**
 * src/engine/systems/narrative/NarrativeService.ts
 * ================================================
 * Data-driven Narrative Service for Sumo Manager Pro.
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
} from "./NarrativeProse";
import type { RikishiArchetype } from "../../types/combat";

const HYSTERESIS_DELTA = 5;

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

export const NarrativeService = {
  getStatBand(value: number, previous?: StatBand): StatBand {
    return toBandWithHysteresis(value, STAT_BANDS, previous);
  },

  getStatLabel(rng: SeededRNG, band: StatBand): string {
    return getStatLabel(rng, band);
  },

  describeAttribute(rng: SeededRNG, attribute: string, value: number): string {
    const band = this.getStatBand(value);
    return getStatProse(rng, attribute, band);
  },

  getFatigueBand(value: number, previous?: FatigueBand): FatigueBand {
    return toBandWithHysteresis(value, FATIGUE_BANDS, previous);
  },

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
    archetype: RikishiArchetype
  ): { label: string; description: string } {
    return getArchetypeInfo(rng, archetype);
  },
};
