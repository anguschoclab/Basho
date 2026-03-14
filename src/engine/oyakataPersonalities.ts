// oyakataPersonalities.ts
// Defines the archetypes and traits for NPC Managers.
// Used to generate diverse and believing opponents.

import { rngFromSeed, rngForWorld, SeededRNG } from "./rng";
import type { Oyakata, OyakataArchetype, OyakataTraits } from "./types/oyakata";

/** o y a k a t a_ a r c h e t y p e s. */
export const OYAKATA_ARCHETYPES: Record<OyakataArchetype, OyakataTraits> = {
  traditionalist: {
    ambition: 50,
    patience: 80,
    risk: 20,
    tradition: 90,
    compassion: 40
  },
  scientist: {
    ambition: 70,
    patience: 60,
    risk: 40,
    tradition: 10,
    compassion: 70
  },
  gambler: {
    ambition: 90,
    patience: 20,
    risk: 90,
    tradition: 30,
    compassion: 20
  },
  nurturer: {
    ambition: 30,
    patience: 90,
    risk: 10,
    tradition: 50,
    compassion: 95
  },
  tyrant: {
    ambition: 100,
    patience: 30,
    risk: 70,
    tradition: 80,
    compassion: 5
  },
  strategist: {
    ambition: 80,
    patience: 70,
    risk: 30,
    tradition: 40,
    compassion: 50
  }
};

const ARCHETYPE_DESCRIPTIONS: Record<OyakataArchetype, string> = {
  traditionalist: "Believes in spirit, endless repetition, and yotsu-sumo. Dislikes modern sports science.",
  scientist: "Analytic approach. Values rest, nutrition, and data over blind tradition.",
  gambler: "High risk, high reward. Pushes rikishi to the breaking point for glory.",
  nurturer: "Protects their wrestlers like family. Produces long careers but few superstars.",
  tyrant: "Rules through fear. Demands victory at any cost. High turnover rate.",
  strategist: "Balanced and cunning. Adapts training to the current meta."
};

const FORMER_SHIKONA_SUFFIXES = ["yama", "gawa", "fuji", "umi", "kuni", "hime", "maru", "ryu"];
const FORMER_SHIKONA_PREFIXES = ["Taka", "Waka", "Koto", "Tochi", "Chiyo", "Hoku", "Asa", "Tera"];

/**
 * Generate random shikona.
 *  * @param seed - The Seed.
 *  * @returns The result.
 */
function generateRandomShikona(seed: string): string {
  // Simple deterministic generation based on seed length/chars
  const preIdx = seed.charCodeAt(0) % FORMER_SHIKONA_PREFIXES.length;
  const sufIdx = seed.charCodeAt(seed.length - 1) % FORMER_SHIKONA_SUFFIXES.length;
  return FORMER_SHIKONA_PREFIXES[preIdx] + FORMER_SHIKONA_SUFFIXES[sufIdx];
}

/**
 * Generate oyakata.
 *  * @param id - The Id.
 *  * @param heyaId - The Heya id.
 *  * @param name - The Name.
 *  * @param age - The Age.
 *  * @param archetype - The Archetype.
 *  * @returns The result.
 */
export function generateOyakata(
  id: string,
  heyaId: string,
  name: string,
  age: number,
  archetype?: OyakataArchetype
): Oyakata {
    const rng = rngFromSeed(id, "oyakata", "personality");
// Determine archetype randomly if not provided
  const keys = Object.keys(OYAKATA_ARCHETYPES) as OyakataArchetype[];
  const type = archetype || (keys.length ? keys[rng.int(0, keys.length - 1)] : "traditionalist");
  
  const baseTraits = OYAKATA_ARCHETYPES[type];
  
  // Apply small random variance to traits (+/- 10)
  const vary = (val: number) => Math.max(0, Math.min(100, val + ((rng.next() * 20) - 10)));

  return {
    id,
    heyaId,
    name,
    age,
    archetype: type,
    traits: {
      ambition: vary(baseTraits.ambition),
      patience: vary(baseTraits.patience),
      risk: vary(baseTraits.risk),
      tradition: vary(baseTraits.tradition),
      compassion: vary(baseTraits.compassion)
    },
    formerShikona: generateRandomShikona(id),
    highestRank: rng.bool(0.3) ? "Komusubi" : "Maegashira",
    yearsInCharge: rng.int(1, 20)
  };
}

/**
 * Get archetype description.
 *  * @param type - The Type.
 *  * @returns The result.
 */
export function getArchetypeDescription(type: OyakataArchetype): string {
  return ARCHETYPE_DESCRIPTIONS[type];
}