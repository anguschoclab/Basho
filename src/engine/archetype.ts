import { RikishiStats } from "./types/rikishi";
import { RikishiArchetype, Style } from "./types/combat";

/**
 * Derives the first-class Archetype for a rikishi based on stats, 
 * physicals, and combat style.
 * 
 * @param stats - Raw rikishi stats (strength, technique, etc.)
 * @param physicals - Height (cm) and Weight (kg)
 * @param style - Base combat style (oshi, yotsu, hybrid)
 * @returns {RikishiArchetype} The derived archetype
 */
export function deriveArchetype(
  stats: RikishiStats,
  physicals: { height: number; weight: number },
  style: Style
): RikishiArchetype {
  const { strength, technique, speed, mental, balance } = stats;
  const { weight } = physicals;

  // 1. Explosive_Blitzer: High speed + High aggression (mental) + Oshi style
  if (speed >= 70 && mental >= 70 && style === "oshi") {
    return "Explosive_Blitzer";
  }

  // 2. Immovable_Mountain: Massive weight + High balance + High power (strength)
  if (weight >= 160 && balance >= 65 && strength >= 60) {
    return "Immovable_Mountain";
  }

  // 3. Defensive_Stalwart: High technique + High balance + Yotsu style
  if (technique >= 65 && balance >= 70 && style === "yotsu") {
    return "Defensive_Stalwart";
  }

  // 4. Acrobatic_Trickster: High speed + High technique + Lower weight
  if (speed >= 75 && technique >= 70 && weight < 130) {
    return "Acrobatic_Trickster";
  }

  // 5. Fallback: All_Rounder
  return "All_Rounder";
}
