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
  TraitBand
} from "./NarrativeBands";

// === Attribute Labels (Short) ===
export function getStatLabel(rng: SeededRNG, band: StatBand): string {
  return BardEngine.resolve(rng, `system.descriptors.bands.stats.${band}`).text;
}

// === Attribute Prose (Verbose) ===
export function getStatProse(rng: SeededRNG, attribute: string, band: StatBand): string {
  return BardEngine.resolve(rng, `rikishi.stats.${attribute.toLowerCase()}.${band}`).text;
}

// === Fatigue Labels ===
export function getFatigueLabel(rng: SeededRNG, band: FatigueBand): string {
  // Map 'light' to 'tired' or similar if missing, but we added 'tired', 'worn', 'exhausted'
  // Legacy mapping adjustments
  let path = band as string;
  if (band === "light") path = "tired";
  if (band === "spent") path = "exhausted";
  
  return BardEngine.resolve(rng, `system.descriptors.bands.fatigue.${path}`).text;
}

// === Momentum Labels ===
export function getMomentumLabel(rng: SeededRNG, band: MomentumBand): string {
  return BardEngine.resolve(rng, `ui.digest.status.${band}`, { intensity: 1 }).text;
}

// === Potential Labels & Prose ===
export function getPotentialInfo(rng: SeededRNG, band: PotentialBand): { label: string; description: string } {
  // Mapping legacy bands to archive paths
  let path = band as string;
  if (band === "generational") path = "Taiki Bansei";
  if (band === "star")         path = "Soshitsu Ari";
  if (band === "solid")        path = "Mikan no Taiki";
  if (band === "average")      path = "Mikan no Taiki"; // Consolidating
  if (band === "limited")      path = "Genkai";
  
  const label = BardEngine.resolve(rng, `rikishi.descriptors.potential.${path}.label`).text;
  const description = BardEngine.resolve(rng, `rikishi.descriptors.potential.${path}.tooltip`).text;
  
  return { label, description };
}

// === Rivalry Heat Labels ===
export function getRivalryHeatLabel(rng: SeededRNG, band: RivalryHeatBand): string {
  // Use H2H paths or generic bands if we add them. 
  // For now, returning capitalized band as fallback if not in archive
  return band.charAt(0).toUpperCase() + band.slice(1);
}

// === Scandal Labels ===
export function getScandalLabel(rng: SeededRNG, band: ScandalBand): string {
  return band.charAt(0).toUpperCase() + band.slice(1);
}

// === Prize Labels ===
export function getPrizeLabel(rng: SeededRNG, band: PrizeBand): string {
  return band.charAt(0).toUpperCase() + band.slice(1);
}

// === Trait Labels ===
export function getTraitLabel(rng: SeededRNG, band: TraitBand): string {
  return band.charAt(0).toUpperCase() + band.slice(1);
}

// === Archetype Info ===
export function getArchetypeInfo(rng: SeededRNG, archetype: RikishiArchetype): { label: string; description: string } {
  const label = BardEngine.resolve(rng, `rikishi.archetypes.${archetype}.label`).text;
  const description = BardEngine.resolve(rng, `rikishi.archetypes.${archetype}.description`).text;
  
  return { label, description };
}
