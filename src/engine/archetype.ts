import { RikishiStats } from "./types/rikishi";
import { RikishiArchetype, Style, TacticalArchetype } from "./types/combat";
import { SeededRNG } from "./rng";

/**
 * Mapping of Tactical Archetypes (Combat Philosophy) to possible descriptive labels (RikishiArchetype).
 */
const LABEL_MAPPING: Record<TacticalArchetype, { label: RikishiArchetype; weight: number }[]> = {
  oshi_specialist: [
    { label: "Explosive_Blitzer", weight: 0.7 },
    { label: "All_Rounder", weight: 0.2 },
    { label: "Immovable_Mountain", weight: 0.1 }
  ],
  yotsu_specialist: [
    { label: "Defensive_Stalwart", weight: 0.6 },
    { label: "Immovable_Mountain", weight: 0.3 },
    { label: "All_Rounder", weight: 0.1 }
  ],
  speedster: [
    { label: "Explosive_Blitzer", weight: 0.5 },
    { label: "Acrobatic_Trickster", weight: 0.4 },
    { label: "All_Rounder", weight: 0.1 }
  ],
  trickster: [
    { label: "Acrobatic_Trickster", weight: 0.8 },
    { label: "Defensive_Stalwart", weight: 0.1 },
    { label: "All_Rounder", weight: 0.1 }
  ],
  all_rounder: [
    { label: "All_Rounder", weight: 1.0 }
  ],
  hybrid_oshi_yotsu: [
    { label: "All_Rounder", weight: 0.6 },
    { label: "Explosive_Blitzer", weight: 0.2 },
    { label: "Defensive_Stalwart", weight: 0.2 }
  ],
  counter_specialist: [
    { label: "Defensive_Stalwart", weight: 0.7 },
    { label: "Acrobatic_Trickster", weight: 0.2 },
    { label: "All_Rounder", weight: 0.1 }
  ]
};

/**
 * @param stats - Raw rikishi stats (strength, technique, etc.)
 * @param physicals - Height (cm) and Weight (kg)
 * @param style - Base combat style (oshi, yotsu, hybrid)
 * @param tacticalArch - Innate Tactical Archetype (Philosophy)
 * @param rng - Optional RNG for deterministic generation
 * @returns {RikishiArchetype} The descriptive archetype label
 */
export function deriveArchetype(
  stats: RikishiStats,
  physicals: { height: number; weight: number },
  style: Style,
  tacticalArch?: TacticalArchetype,
  rng?: SeededRNG
): RikishiArchetype {
  // If we have a tacticalArch and RNG, use weighted random selection
  if (tacticalArch && rng) {
    const options = LABEL_MAPPING[tacticalArch];
    const roll = rng.next();
    let cumulative = 0;
    for (const opt of options) {
      cumulative += opt.weight;
      if (roll < cumulative) return opt.label;
    }
    return options[0].label;
  }

  // Fallback to legacy logic if missing critical info (for backward compatibility)
  const { strength, technique, speed, mental, balance } = stats;
  const { weight } = physicals;

  if (speed >= 70 && mental >= 70 && style === "oshi") {
    return "Explosive_Blitzer";
  }
  if (weight >= 160 && balance >= 65 && strength >= 60) {
    return "Immovable_Mountain";
  }
  if (technique >= 65 && balance >= 70 && style === "yotsu") {
    return "Defensive_Stalwart";
  }
  if (speed >= 75 && technique >= 70 && weight < 130) {
    return "Acrobatic_Trickster";
  }

  return "All_Rounder";
}
