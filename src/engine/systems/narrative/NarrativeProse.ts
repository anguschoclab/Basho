/**
 * src/engine/systems/narrative/NarrativeProse.ts
 * ==============================================
 * Data-driven labels and flavor text for Sumo Manager Pro.
 *
 * Wired to the Bard Engine for centralized, randomized narrative generation.
 * All functions require a SeededRNG to ensure simulation determinism.
 */

import { BardEngine } from "../../narrative/BardEngine";
import { SeededRNG } from "../../rng";
import type { RikishiArchetype } from "../../types/combat";
import type {
  StatBand,
  FatigueBand,
  MomentumBand,
  RivalryHeatBand,
  PotentialBand,
  ScandalBand,
  PrizeBand,
  TraitBand,
  AgeBand,
  ExperienceBand,
  WeightBand,
  ReputationBand,
  InjurySeverityBand,
  WinRateBand,
  HeightBand,
} from "./NarrativeBands";

// === Attribute Labels (Short) ===
export function getStatLabel(rng: SeededRNG, band: StatBand): string {
  return BardEngine.resolve(rng, `system.descriptors.bands.stats.${band}`).text;
}

// === Attribute Prose (Verbose) ===
const STAT_ALIAS: Record<string, string> = {
  strength: "power",
  stamina: "balance",
};
export function getStatProse(rng: SeededRNG, attribute: string, band: StatBand): string {
  const key = attribute.toLowerCase();
  const path = STAT_ALIAS[key] ?? key;
  return BardEngine.resolve(rng, `rikishi.stats.${path}.${band}`).text;
}

// === Fatigue Labels ===
export function getFatigueLabel(rng: SeededRNG, band: FatigueBand): string {
  return BardEngine.resolve(rng, `system.descriptors.bands.fatigue.${band}`).text;
}

// === Momentum Labels ===
export function getMomentumLabel(rng: SeededRNG, band: MomentumBand): string {
  return BardEngine.resolve(rng, `system.descriptors.bands.momentum.${band}`).text;
}

// === Potential Labels & Prose ===
export function getPotentialInfo(
  rng: SeededRNG,
  band: PotentialBand
): { label: string; description: string } {
  // Mapping legacy bands to archive paths
  let path = band as string;
  if (band === "generational") path = "Taiki Bansei";
  if (band === "star") path = "Soshitsu Ari";
  if (band === "solid") path = "Mikan no Taiki";
  if (band === "average") path = "Mikan no Taiki";
  if (band === "limited") path = "Genkai";

  const label = BardEngine.resolve(rng, `rikishi.descriptors.potential.${path}.label`).text;
  const description = BardEngine.resolve(rng, `rikishi.descriptors.potential.${path}.tooltip`).text;

  return { label, description };
}

// === Rivalry Heat Labels ===
export function getRivalryHeatLabel(rng: SeededRNG, band: RivalryHeatBand): string {
  return BardEngine.resolve(rng, `system.descriptors.bands.rivalry.${band}`).text;
}

// === Scandal Labels ===
export function getScandalLabel(rng: SeededRNG, band: ScandalBand): string {
  return BardEngine.resolve(rng, `system.descriptors.bands.scandal.${band}`).text;
}

// === Prize Labels ===
export function getPrizeLabel(rng: SeededRNG, band: PrizeBand): string {
  return BardEngine.resolve(rng, `system.descriptors.bands.prizes.${band}`).text;
}

// === Trait Labels ===
export function getTraitLabel(rng: SeededRNG, band: TraitBand): string {
  return BardEngine.resolve(rng, `system.descriptors.bands.traits.${band}`).text;
}

// === Archetype Info ===
export function getArchetypeInfo(
  rng: SeededRNG,
  archetype: RikishiArchetype
): { label: string; description: string } {
  const label = BardEngine.resolve(rng, `rikishi.archetypes.${archetype}.label`).text;
  const description = BardEngine.resolve(rng, `rikishi.archetypes.${archetype}.description`).text;

  return { label, description };
}

// === Age Labels ===
export function getAgeLabel(rng: SeededRNG, band: AgeBand): string {
  return BardEngine.resolve(rng, `system.descriptors.bands.age.${band}`).text;
}

// === Experience Labels ===
export function getExperienceLabel(rng: SeededRNG, band: ExperienceBand): string {
  return BardEngine.resolve(rng, `system.descriptors.bands.experience.${band}`).text;
}

// === Weight Labels ===
export function getWeightLabel(rng: SeededRNG, band: WeightBand): string {
  return BardEngine.resolve(rng, `system.descriptors.bands.weight.${band}`).text;
}

// === Height Labels ===
export function getHeightLabel(rng: SeededRNG, band: HeightBand): string {
  return BardEngine.resolve(rng, `system.descriptors.bands.height.${band}`).text;
}

// === Reputation Labels ===
export function getReputationLabel(rng: SeededRNG, band: ReputationBand): string {
  return BardEngine.resolve(rng, `system.descriptors.bands.reputation.${band}`).text;
}

// === Injury Severity Labels ===
export function getInjurySeverityLabel(rng: SeededRNG, band: InjurySeverityBand): string {
  return BardEngine.resolve(rng, `system.descriptors.bands.injury.${band}`).text;
}

// === Win Rate Labels ===
export function getWinRateLabel(rng: SeededRNG, band: WinRateBand): string {
  return BardEngine.resolve(rng, `system.descriptors.bands.winrate.${band}`).text;
}

/**
 * Hydrates a raw descriptor band (condition, morale, potential) with
 * resolved labels and tooltips.
 */
export function hydrateDescriptor(
  rng: SeededRNG,
  group: "condition" | "morale" | "potential",
  bandId: string
): { label: string; tooltip: string } {
  const label = BardEngine.resolve(rng, `rikishi.descriptors.${group}.${bandId}.label`).text;
  const tooltip = BardEngine.resolve(rng, `rikishi.descriptors.${group}.${bandId}.tooltip`).text;
  return { label, tooltip };
}
