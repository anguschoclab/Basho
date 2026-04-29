/**
 * Stats Transformer
 * =================
 * Transforms rikishi stats, bands, and perceived stats.
 */

import type { Rikishi } from "../../../engine/types/rikishi";
import { SeededRNG } from "../../../engine/rng";
import { NarrativeService } from "../../../engine/systems/narrative/NarrativeService";
import { getCareerPhase } from "../../../engine/systems/training/TrainingMath";
import type {
  RikishiStatusDTO,
  RikishiBandsDTO,
  RikishiPerceivedStatsDTO,
  RikishiDescriptorDTO,
} from "../types";
import { toRikishiDescriptor } from "../../../engine/descriptorBands";
import { calculateInjurySummary } from "./injury";

/**
 * Transform status fields (injury, condition, etc.)
 */
export function toStatusDTO(r: Rikishi, rng: SeededRNG): RikishiStatusDTO {
  return {
    isRetired: r.isRetired ?? false,
    isInjured: r.injured,
    injurySummary: calculateInjurySummary(rng, r),
    condition: r.condition,
    motivation: r.motivation,
    fatigue: r.fatigue,
  };
}

/**
 * Transform stat bands.
 */
export function toBandsDTO(r: Rikishi, rng: SeededRNG): RikishiBandsDTO {
  return {
    powerBand: NarrativeService.getStatLabel(rng, NarrativeService.getStatBand(r.power ?? 50)),
    techniqueBand: NarrativeService.getStatLabel(
      rng,
      NarrativeService.getStatBand(r.technique ?? 50)
    ),
    speedBand: NarrativeService.getStatLabel(rng, NarrativeService.getStatBand(r.speed ?? 50)),
    balanceBand: NarrativeService.getStatLabel(rng, NarrativeService.getStatBand(r.balance ?? 50)),
    momentum: r.momentum,
    careerPhase: getCareerPhase(r.experience),
  };
}

/**
 * Transform perceived stats (UI labels).
 */
export function toPerceivedStatsDTO(r: Rikishi, rng: SeededRNG): RikishiPerceivedStatsDTO {
  return {
    strength: NarrativeService.getStatLabel(
      rng,
      NarrativeService.getStatBand(r.stats?.strength ?? 50)
    ),
    technique: NarrativeService.getStatLabel(
      rng,
      NarrativeService.getStatBand(r.stats?.technique ?? 50)
    ),
    speed: NarrativeService.getStatLabel(rng, NarrativeService.getStatBand(r.stats?.speed ?? 50)),
    stamina: NarrativeService.getStatLabel(
      rng,
      NarrativeService.getStatBand(r.stats?.stamina ?? 50)
    ),
    mental: NarrativeService.getStatLabel(rng, NarrativeService.getStatBand(r.stats?.mental ?? 50)),
    adaptability: NarrativeService.getStatLabel(
      rng,
      NarrativeService.getStatBand(r.stats?.adaptability ?? 50)
    ),
    balance: NarrativeService.getStatLabel(
      rng,
      NarrativeService.getStatBand(r.stats?.balance ?? 50)
    ),
  };
}

/**
 * Transform descriptors and potential bands.
 */
export function toDescriptorDTO(r: Rikishi, rng: SeededRNG): RikishiDescriptorDTO {
  return {
    descriptor: toRikishiDescriptor(rng, r, r.descriptor),
    potentialBand: NarrativeService.getPotentialBand(r.talentSeed ?? 50),
    conditionDescriptor: NarrativeService.getConditionDescriptor(rng, r.condition ?? 0.5).label,
    moraleDescriptor: NarrativeService.getMoraleDescriptor(rng, r.motivation ?? 0.5).label,
    potentialDescriptor: NarrativeService.getPotentialDescriptor(rng, r.talentSeed ?? 50).label,
  };
}
