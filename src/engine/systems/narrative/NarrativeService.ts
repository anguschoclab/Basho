/**
 * src/engine/systems/narrative/NarrativeService.ts
 * ================================================
 * Hysteresis-based Narrative Engine for Sumo Manager Pro.
 * 
 * Provides the core observability layer, translating raw engine values 
 * into qualitative bands (Exceptional, Strong, Fresh, etc.) and verbose prose.
 * 
 * Built-in Hysteresis (Constitution C5.3) prevents visual "flicker" 
 * when a value oscillates near a boundary.
 * 
 * Goal: Quality-first simulation feedback.
 */

import { clamp } from "../../utils/math";
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
  DescriptorBand
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
  POTENTIAL_DESCRIPTOR_BANDS
} from "./NarrativeBands";
import { 
  STAT_LABELS, 
  STAT_PROSE, 
  FATIGUE_LABELS 
} from "./NarrativeProse";

// [CONSTITUTION C5.3]
const HYSTERESIS_DELTA = 5;

/** 
 * Resolve a raw value to a qualitative band with hysteresis (Constitution C5.3).
 */
function toBandWithHysteresis<T extends string>(
  value: number,
  ladder: BandDef<T>[],
  lastBand?: T
): T {
  const v = clamp(value, 0, 100);
  const resolved = ladder.find(b => v >= b.min && v < b.max) ?? ladder[ladder.length - 1];

  if (lastBand && lastBand !== resolved.band) {
    const prevDef = ladder.find(b => b.band === lastBand);
    if (prevDef) {
       // Upward Transition: enters higher band immediately
       if (v >= prevDef.max) return resolved.band;
       // Downward Transition: sticks to band unless it drops below threshold - hysteresis
       if (v <= prevDef.min - HYSTERESIS_DELTA) return resolved.band;
       return lastBand;
    }
  }

  return resolved.band;
}

/**
 * Unified Narrative Service.
 */
export const NarrativeService = {
  /**
   * Translate 0-100 stat into a StatBand.
   */
  getStatBand(value: number, previous?: StatBand): StatBand {
    return toBandWithHysteresis(value, STAT_BANDS, previous);
  },

  /**
   * Get localized label for a StatBand.
   */
  getStatLabel(band: StatBand): string {
    return STAT_LABELS[band];
  },

  /**
   * Get verbose description for an attribute.
   */
  describeAttribute(attribute: string, value: number): string {
    const band = this.getStatBand(value);
    return STAT_PROSE[attribute]?.[band] ?? `${STAT_LABELS[band]} ${attribute}`;
  },

  /**
   * Fatigue Mapping.
   */
  getFatigueBand(value: number, previous?: FatigueBand): FatigueBand {
    return toBandWithHysteresis(value, FATIGUE_BANDS, previous);
  },

  getFatigueLabel(band: FatigueBand): string {
    return FATIGUE_LABELS[band];
  },

  /**
   * Potential Mapping.
   */
  getPotentialBand(talentSeed: number | undefined, previous?: PotentialBand): PotentialBand {
    if (talentSeed == null) return "unknown";
    return toBandWithHysteresis(talentSeed, POTENTIAL_BANDS, previous);
  },

  /**
   * Momentum Mapping (Non-hysteresis, usually short-lived).
   */
  getMomentumBand(momentum: number): MomentumBand {
    const v = Math.abs(momentum) > 10 ? (clamp(momentum, 0, 100) - 50) / 10 : clamp(momentum, -5, 5);
    if (v >= 3) return "on_fire";
    if (v >= 1) return "rising";
    if (v <= -3) return "in_crisis";
    if (v <= -1) return "struggling";
    return "steady";
  },

  /**
   * Rivalry Heat Mapping (0–100).
   */
  getRivalryHeatBand(value: number, previous?: RivalryHeatBand): RivalryHeatBand {
    return toBandWithHysteresis(value, RIVALRY_HEAT_BANDS, previous);
  },

  /**
   * Scandal Mapping (0–100).
   */
  getScandalBand(value: number, previous?: ScandalBand): ScandalBand {
    return toBandWithHysteresis(value, SCANDAL_BANDS, previous);
  },

  /**
   * Trait Mapping (0–100).
   */
  getTraitBand(value: number, previous?: TraitBand): TraitBand {
    return toBandWithHysteresis(value, TRAIT_BANDS, previous);
  },

  /**
   * Prize Mapping (yen amounts — no 0–100 clamp, direct lookup).
   */
  getPrizeBand(amount: number): PrizeBand {
    const resolved = PRIZE_BANDS.find(b => amount >= b.min && amount < b.max);
    return resolved?.band ?? PRIZE_BANDS[PRIZE_BANDS.length - 1].band;
  },

  /**
   * Condition Descriptor (Iki & Koshi — Breath & Hips).
   * Input: 0.0–1.0 float (r.condition).
   */
  getConditionDescriptor(value: number): DescriptorBand {
    const v = clamp(value, 0, 1);
    return (
      CONDITION_DESCRIPTOR_BANDS.find(b => v >= b.min && v < b.max)?.band ??
      CONDITION_DESCRIPTOR_BANDS[CONDITION_DESCRIPTOR_BANDS.length - 1].band
    );
  },

  /**
   * Morale Descriptor (Kiai — Fighting Spirit).
   * Input: 0.0–1.0 float (r.motivation).
   */
  getMoraleDescriptor(value: number): DescriptorBand {
    const v = clamp(value, 0, 1);
    return (
      MORALE_DESCRIPTOR_BANDS.find(b => v >= b.min && v < b.max)?.band ??
      MORALE_DESCRIPTOR_BANDS[MORALE_DESCRIPTOR_BANDS.length - 1].band
    );
  },

  /**
   * Potential Descriptor (Soshitsu — Innate Talent).
   * Input: 0–100 integer (r.talentSeed).
   */
  getPotentialDescriptor(talentSeed: number): DescriptorBand {
    const v = clamp(talentSeed, 0, 100);
    return (
      POTENTIAL_DESCRIPTOR_BANDS.find(b => v >= b.min && v < b.max)?.band ??
      POTENTIAL_DESCRIPTOR_BANDS[POTENTIAL_DESCRIPTOR_BANDS.length - 1].band
    );
  },
};
