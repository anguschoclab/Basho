import { RikishiStats } from "./types/rikishi";
import { CombatArchetype, CombatProfile, Style, RikishiArchetype } from "./types/combat";
import { SeededRNG } from "./rng";

/**
 * Legacy support for archetype derivation based on stats.
 * @deprecated Use combatProfile.archetype as the canonical archetype.
 * Retained only for generating derivedArchetype UI labels on existing rikishi.
 */
export function deriveArchetype(stats: RikishiStats, physicals: { height: number, weight: number }, style: Style): RikishiArchetype {
  if (style === "oshi" && stats.speed >= 70) return "Explosive_Blitzer";
  if (style === "yotsu" && physicals.weight >= 170) return "Immovable_Mountain";
  if (style === "yotsu" && stats.technique >= 75) return "Defensive_Stalwart";
  if (stats.speed >= 80 && stats.technique >= 75) return "Acrobatic_Trickster";
  return "All_Rounder";
}

const ARCHETYPE_DEFINITIONS: Record<CombatArchetype, Omit<CombatProfile, 'archetype'>> = {
  trickster: {
    familyPreferences: { push: 10, belt: 15, trick: 55, speed: 20 },
    preferredGrip: 'none',
    preferredGripDepth: 'standard',
    statModifiers: { technique: 1.2, speed: 1.1, weight: 0.9, strength: 0.85 }
  },
  oshi: {
    familyPreferences: { push: 75, belt: 10, trick: 5, speed: 10 },
    preferredGrip: 'none',
    preferredGripDepth: 'standard',
    statModifiers: { strength: 1.1, speed: 1.1, technique: 0.8 }
  },
  yotsu: {
    familyPreferences: { push: 15, belt: 75, trick: 5, speed: 5 },
    preferredGrip: 'migi',
    preferredGripDepth: 'standard',
    statModifiers: { strength: 1.15, weight: 1.1, speed: 0.85 }
  },
  speedster: {
    familyPreferences: { push: 10, belt: 5, trick: 15, speed: 70 },
    preferredGrip: 'none',
    preferredGripDepth: 'maemitsu',
    statModifiers: { speed: 1.25, technique: 1.1, weight: 0.85, strength: 0.8 }
  },
  giant: {
    familyPreferences: { push: 40, belt: 50, trick: 5, speed: 5 },
    preferredGrip: 'none',
    preferredGripDepth: 'deep',
    statModifiers: { weight: 1.3, strength: 1.2, speed: 0.7, balance: 0.9 }
  },
  hybrid: {
    familyPreferences: { push: 40, belt: 40, trick: 10, speed: 10 },
    preferredGrip: 'none',
    preferredGripDepth: 'standard',
    statModifiers: { strength: 1.05, technique: 1.05, weight: 1.05 }
  },
  /**
   * Tsuppari — rapid open-palm thrusting (Takakeisho style).
   * High aggression, no belt contact, tires quickly under grappling.
   */
  tsuppari: {
    familyPreferences: { push: 85, belt: 2, trick: 8, speed: 5 },
    preferredGrip: 'none',
    preferredGripDepth: 'standard',
    statModifiers: { strength: 1.15, speed: 1.05, stamina: 0.85, technique: 0.9 },
    favoredKimarite: ['tsukidashi', 'tsukitaoshi', 'tsukiotoshi', 'oshidashi', 'hatakikomi'],
  },
  /**
   * Defensive — counter-wrestler archetype.
   * Low tachiai investment; reads and punishes opponent's aggression.
   */
  defensive: {
    familyPreferences: { push: 10, belt: 35, trick: 40, speed: 15 },
    preferredGrip: 'none',
    preferredGripDepth: 'standard',
    statModifiers: { technique: 1.2, speed: 1.1, strength: 0.9, balance: 1.15, weight: 0.95 },
    favoredKimarite: ['hatakikomi', 'hikiotoshi', 'tsukiotoshi', 'uwatenage', 'ketaguri', 'katasukashi'],
  },
};

/**
 * Randomly assign an archetype based on a realistic population distribution.
 * Oshi and yotsu together ~57% (dominates real makuuchi).
 * Tsuppari 7%, defensive 6% added for gameplay variety.
 */
export function rollArchetype(rng: SeededRNG): CombatArchetype {
  const roll = rng.next();
  if (roll < 0.30) return 'oshi';
  if (roll < 0.57) return 'yotsu';
  if (roll < 0.65) return 'trickster';
  if (roll < 0.73) return 'speedster';
  if (roll < 0.80) return 'tsuppari';   // 7%
  if (roll < 0.86) return 'defensive';  // 6%
  if (roll < 0.92) return 'giant';      // 6%
  return 'hybrid';                       // 8%
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
