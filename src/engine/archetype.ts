import { RikishiStats } from "./types/rikishi";
import { CombatArchetype, CombatProfile } from "./types/combat";
import { SeededRNG } from "./rng";

export const ARCHETYPE_DEFINITIONS: Record<CombatArchetype, Omit<CombatProfile, 'archetype'>> = {
  trickster: {
    familyPreferences: { push: 10, belt: 15, trick: 55, speed: 20 },
    preferredGrip: 'none',
    statModifiers: { technique: 1.2, speed: 1.1, weight: 0.9, strength: 0.85 }
  },
  oshi: {
    familyPreferences: { push: 75, belt: 10, trick: 5, speed: 10 },
    preferredGrip: 'none',
    statModifiers: { strength: 1.1, speed: 1.1, technique: 0.8 }
  },
  yotsu: {
    familyPreferences: { push: 15, belt: 75, trick: 5, speed: 5 },
    preferredGrip: 'migi', // Default for yotsu, can be randomized later
    statModifiers: { strength: 1.15, weight: 1.1, speed: 0.85 }
  },
  speedster: {
    familyPreferences: { push: 10, belt: 5, trick: 15, speed: 70 },
    preferredGrip: 'none',
    statModifiers: { speed: 1.25, technique: 1.1, weight: 0.85, strength: 0.8 }
  },
  giant: {
    familyPreferences: { push: 40, belt: 50, trick: 5, speed: 5 },
    preferredGrip: 'none',
    statModifiers: { weight: 1.3, strength: 1.2, speed: 0.7, balance: 0.9 }
  },
  hybrid: {
    familyPreferences: { push: 40, belt: 40, trick: 10, speed: 10 },
    preferredGrip: 'none',
    statModifiers: { strength: 1.05, technique: 1.05, weight: 1.05 }
  }
};

/**
 * Randomly assign an archetype based on a global distribution.
 */
export function rollArchetype(rng: SeededRNG): CombatArchetype {
  const roll = rng.next();
  if (roll < 0.35) return 'oshi';
  if (roll < 0.70) return 'yotsu';
  if (roll < 0.80) return 'trickster';
  if (roll < 0.90) return 'speedster';
  if (roll < 0.95) return 'giant';
  return 'hybrid';
}

/**
 * Build a full CombatProfile for a given archetype.
 */
export function buildCombatProfile(archetype: CombatArchetype): CombatProfile {
  return {
    archetype,
    ...ARCHETYPE_DEFINITIONS[archetype]
  };
}

/**
 * Legacy support for label generation.
 * Maps the new archetypes to the old descriptive labels for UI consistency if needed.
 */
export function getArchetypeLabel(archetype: CombatArchetype): string {
  switch (archetype) {
    case 'oshi': return "Explosive_Blitzer";
    case 'yotsu': return "Defensive_Stalwart";
    case 'trickster': return "Acrobatic_Trickster";
    case 'giant': return "Immovable_Mountain";
    case 'speedster': return "Explosive_Blitzer"; // Or a new label
    case 'hybrid': return "All_Rounder";
    default: return "All_Rounder";
  }
}
