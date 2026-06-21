// oyakataPersonalities.ts
// Defines the archetypes and traits for NPC Managers.
// Used to generate diverse and believing opponents.

import { rngFromSeed, SeededRNG } from "./rng";
import type { Oyakata, OyakataArchetype, OyakataTraits, OyakataMood } from "./types/oyakata";
import {
  TRAIT_VARIANCE_RANGE,
  TRAIT_VARIANCE_HALF_RANGE,
  TRAIT_BLEND_VARIANCE_RANGE,
  TRAIT_BLEND_VARIANCE_HALF_RANGE,
  LEGENDARY_YOKOZUNA_THRESHOLD,
  LEGENDARY_OZEKI_THRESHOLD,
  LEGENDARY_SANYAKU_THRESHOLD,
  POWERFUL_YOKOZUNA_THRESHOLD,
  POWERFUL_OZEKI_THRESHOLD,
  POWERFUL_SANYAKU_THRESHOLD,
  ESTABLISHED_YOKOZUNA_THRESHOLD,
  ESTABLISHED_OZEKI_THRESHOLD,
  ESTABLISHED_SANYAKU_THRESHOLD,
  ESTABLISHED_MAEGASHIRA_THRESHOLD,
  QUIRK_COUNT_HIGH,
  QUIRK_COUNT_BASE,
  MAX_YEARS_IN_CHARGE,
  WELFARE_HAWK_COMPASSION_THRESHOLD,
  DISCIPLINE_HAWK_TRADITION_THRESHOLD,
  PUBLICITY_HAWK_AMBITION_THRESHOLD,
  SAN_YAKU_BOOL_CHANCE,
  ADAPTABILITY_TRADITION_INVERSE,
  DEFAULT_HEYA_TIER,
} from "../constants/engine/npcStrategy";

/** o y a k a t a_ a r c h e t y p e s. */
export const OYAKATA_ARCHETYPES: Record<OyakataArchetype, OyakataTraits> = {
  traditionalist: {
    ambition: 50,
    patience: 80,
    risk: 20,
    tradition: 90,
    compassion: 40,
  },
  scientist: {
    ambition: 70,
    patience: 60,
    risk: 40,
    tradition: 10,
    compassion: 70,
  },
  gambler: {
    ambition: 90,
    patience: 20,
    risk: 90,
    tradition: 30,
    compassion: 20,
  },
  nurturer: {
    ambition: 30,
    patience: 90,
    risk: 10,
    tradition: 50,
    compassion: 95,
  },
  tyrant: {
    ambition: 100,
    patience: 30,
    risk: 70,
    tradition: 80,
    compassion: 5,
  },
  strategist: {
    ambition: 80,
    patience: 70,
    risk: 30,
    tradition: 40,
    compassion: 50,
  },
  strict: {
    ambition: 60,
    patience: 40,
    risk: 30,
    tradition: 85,
    compassion: 10,
  },
  indulgent: {
    ambition: 20,
    patience: 70,
    risk: 10,
    tradition: 30,
    compassion: 90,
  },
};

const ARCHETYPE_DESCRIPTIONS: Record<OyakataArchetype, string> = {
  traditionalist:
    "Believes in spirit, endless repetition, and yotsu-sumo. Dislikes modern sports science.",
  scientist: "Analytic approach. Values rest, nutrition, and data over blind tradition.",
  gambler: "High risk, high reward. Pushes rikishi to the breaking point for glory.",
  nurturer: "Protects their wrestlers like family. Produces long careers but few superstars.",
  tyrant: "Rules through fear. Demands victory at any cost. High turnover rate.",
  strategist: "Balanced and cunning. Adapts training to the current meta.",
  strict: "Demands absolute discipline and adherence to strict protocols. No excuses.",
  indulgent: "Very lenient with rikishi. Prioritizes happiness over results.",
};

const FORMER_SHIKONA_SUFFIXES = ["yama", "gawa", "fuji", "umi", "kuni", "hime", "maru", "ryu"];
const FORMER_SHIKONA_PREFIXES = ["Taka", "Waka", "Koto", "Tochi", "Chiyo", "Hoku", "Asa", "Tera"];

const QUIRK_IDS = [
  "Old-School Stickler",
  "Gambler's Instinct",
  "Welfare Hawk",
  "Discipline Hawk",
  "Media Operator",
  "Sleeper Scout",
  "Nepotist",
  "Weight-Cutter",
  "Keiko Romantic",
  "Cold Pragmatist",
  "Family First",
  "Numbers Guy",
] as const;

/**
 * Pick unique items from a pool
 */
function pickUnique<T>(rng: { next: () => number }, items: readonly T[], count: number): T[] {
  const pool = [...items];
  const out: T[] = [];
  while (pool.length && out.length < count) {
    const idx = Math.floor(rng.next() * pool.length);
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}

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
 * Generate realistic rank based on heya tier.
 */
function generateRankByTier(rng: SeededRNG, tier: number): string {
  const roll = rng.next();

  // Legendary heya (tier < 0.2): 40% yokozuna, 35% ozeki, 20% sekiwake/komusubi, 5% maegashira
  if (tier < 0.2) {
    if (roll < LEGENDARY_YOKOZUNA_THRESHOLD) return "Yokozuna";
    if (roll < LEGENDARY_OZEKI_THRESHOLD) return "Ozeki";
    if (roll < LEGENDARY_SANYAKU_THRESHOLD)
      return rng.bool(SAN_YAKU_BOOL_CHANCE) ? "Sekiwake" : "Komusubi";
    return "Maegashira";
  }

  // Powerful heya (tier < 0.5): 20% yokozuna, 35% ozeki, 30% sekiwake/komusubi, 15% maegashira
  if (tier < 0.5) {
    if (roll < POWERFUL_YOKOZUNA_THRESHOLD) return "Yokozuna";
    if (roll < POWERFUL_OZEKI_THRESHOLD) return "Ozeki";
    if (roll < POWERFUL_SANYAKU_THRESHOLD)
      return rng.bool(SAN_YAKU_BOOL_CHANCE) ? "Sekiwake" : "Komusubi";
    return "Maegashira";
  }

  // Established heya (tier >= 0.5): 5% yokozuna, 15% ozeki, 40% sekiwake/komusubi, 30% maegashira, 10% juryo
  if (roll < ESTABLISHED_YOKOZUNA_THRESHOLD) return "Yokozuna";
  if (roll < ESTABLISHED_OZEKI_THRESHOLD) return "Ozeki";
  if (roll < ESTABLISHED_SANYAKU_THRESHOLD)
    return rng.bool(SAN_YAKU_BOOL_CHANCE) ? "Sekiwake" : "Komusubi";
  if (roll < ESTABLISHED_MAEGASHIRA_THRESHOLD) return "Maegashira";
  return "Juryo";
}

/**
 * Generate oyakata.
 *  * @param id - The Id.
 *  * @param heyaId - The Heya id.
 *  * @param name - The Name.
 *  * @param age - The Age.
 *  * @param archetype - The Archetype.
 *  * @param rikishiTraits - Optional rikishi traits to inherit from retiring rikishi.
 *  * @param formerRank - Optional former rank (from retiring rikishi).
 *  * @param formerShikona - Optional former shikona (from retiring rikishi).
 *  * @param heyaTier - Optional heya tier for realistic rank distribution.
 *  * @returns The result.
 */
export function generateOyakata(
  id: string,
  heyaId: string,
  name: string,
  age: number,
  archetype?: OyakataArchetype,
  rikishiTraits?: {
    aggression?: number;
    experience?: number;
    adaptability?: number;
    momentum?: number;
  },
  formerRank?: string,
  formerShikona?: string,
  heyaTier?: number
): Oyakata {
  const rng = rngFromSeed(id, "oyakata", "personality");
  // Determine archetype randomly if not provided
  const keys = Object.keys(OYAKATA_ARCHETYPES) as OyakataArchetype[];
  const type = archetype || (keys.length ? keys[rng.int(0, keys.length - 1)] : "traditionalist");

  const baseTraits = OYAKATA_ARCHETYPES[type];

  // Apply small random variance to traits (+/- 10)
  const vary = (val: number) =>
    Math.max(
      0,
      Math.min(100, val + (rng.next() * TRAIT_VARIANCE_RANGE - TRAIT_VARIANCE_HALF_RANGE))
    );

  // If rikishi traits are provided, blend them with archetype traits (50/50 blend)
  const blend = (base: number, rikishi?: number) => {
    if (rikishi === undefined) return vary(base);
    return Math.max(
      0,
      Math.min(
        100,
        (base + rikishi) / 2 +
          (rng.next() * TRAIT_BLEND_VARIANCE_RANGE - TRAIT_BLEND_VARIANCE_HALF_RANGE)
      )
    );
  };

  // Map rikishi traits to oyakata traits
  // aggression -> risk
  // experience -> patience
  // adaptability -> tradition (inverse: high adaptability = lower tradition)
  // momentum -> ambition
  const traits = {
    ambition: blend(baseTraits.ambition, rikishiTraits?.momentum),
    patience: blend(baseTraits.patience, rikishiTraits?.experience),
    risk: blend(baseTraits.risk, rikishiTraits?.aggression),
    tradition: blend(
      baseTraits.tradition,
      rikishiTraits?.adaptability !== undefined
        ? ADAPTABILITY_TRADITION_INVERSE - rikishiTraits.adaptability
        : undefined
    ),
    compassion: vary(baseTraits.compassion), // No direct rikishi mapping, keep random
  };

  // Generate quirks (same logic as ensurePersonaForOyakata)
  const baseCount = type === "tyrant" || type === "gambler" ? QUIRK_COUNT_HIGH : QUIRK_COUNT_BASE;
  const quirkIds = pickUnique(rng, QUIRK_IDS, baseCount);

  // Generate manager flags based on quirks and traits
  const flags = {
    welfareHawk:
      quirkIds.includes("Welfare Hawk") || traits.compassion >= WELFARE_HAWK_COMPASSION_THRESHOLD,
    disciplineHawk:
      quirkIds.includes("Discipline Hawk") ||
      type === "tyrant" ||
      traits.tradition >= DISCIPLINE_HAWK_TRADITION_THRESHOLD,
    publicityHawk:
      quirkIds.includes("Media Operator") || traits.ambition >= PUBLICITY_HAWK_AMBITION_THRESHOLD,
    nepotist: quirkIds.includes("Nepotist"),
  };

  // Initialize mood
  const mood: OyakataMood = "content";

  // Initialize memory
  const memory = {
    observations: [],
    coreDirectives: [`Maintain the excellence of stable`, `Prioritize ${type} values`],
    lastConsolidationTick: 0,
  };

  // Determine highest rank: use provided formerRank, or generate based on tier
  const highestRank = formerRank || generateRankByTier(rng, heyaTier ?? DEFAULT_HEYA_TIER);

  // Determine former shikona: use provided formerShikona, or generate randomly
  const finalFormerShikona = formerShikona || generateRandomShikona(id);

  return {
    id,
    heyaId,
    name,
    shikona: name,
    age,
    archetype: type,
    traits,
    quirks: quirkIds,
    managerFlags: flags,
    mood,
    memory,
    formerShikona: finalFormerShikona,
    highestRank,
    yearsInCharge: rng.int(1, MAX_YEARS_IN_CHARGE),
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
