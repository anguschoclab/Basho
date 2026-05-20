/**
 * src/engine/systems/NPCPersonaService.ts
 * ==========================================
 * NPC Persona Service
 *
 * Responsibilities:
 * - Generate and manage oyakata (stable master) personalities
 * - Calculate decision-making traits based on archetype and quirks
 * - Project full persona for AI decision making
 *
 * @see Oyakata types for personality structure
 */

import { WorldState } from "../types/world";
import { StyleBias } from "../types/training";
import { OyakataArchetype, Oyakata, OyakataMood } from "../types/oyakata";
import { rngForWorld } from "../rng";
import { getHeyaStyleBias, getOyakataForHeya, getHeya } from "../queries";
import { getCachedPerception, PerceptionSnapshot } from "../perception";
import { BardEngine } from "../narrative/BardEngine";

/**
 * NPC Persona structure for decision making.
 * Combines archetype, traits, quirks, and calculated decision factors.
 */
export interface NPCPersona {
  /** The oyakata's archetype (e.g., tyrant, mentor, gambler). */
  archetype: OyakataArchetype | "unknown";
  /** Core personality traits (0-100 scale). */
  traits: {
    ambition: number;
    patience: number;
    risk: number;
    tradition: number;
    compassion: number;
  };
  /** Personality quirks (narrative flavor text). */
  quirks: string[];
  /** Behavioral flags derived from traits and quirks. */
  flags: {
    welfareHawk: boolean;
    disciplineHawk: boolean;
    publicityHawk: boolean;
    nepotist: boolean;
  };
  /** Preferred combat style bias for rikishi recruitment. */
  styleBias: StyleBias;
  /** Calculated welfare vs discipline balance (0-1). */
  welfareDiscipline: number;
  /** Calculated risk appetite (0-1). */
  riskAppetite: number;
  /** Current perception snapshot of the heya. */
  perception: PerceptionSnapshot;
  /** Current mood of the oyakata. */
  mood: OyakataMood;
}

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
 * Pick unique items from a pool using RNG.
 * Randomly selects the specified number of unique items from the pool.
 *
 * @param {{ next: () => number }} rng - The RNG instance.
 * @param {readonly T[]} items - The pool of items to select from.
 * @param {number} count - The number of unique items to select.
 * @returns {T[]} Array of unique selected items.
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
 * Ensure an Oyakata has a defined persona (quirks and flags).
 * Generates quirks and behavioral flags if not already present.
 *
 * @param {WorldState} world - The current world state.
 * @param {Oyakata} oyakata - The oyakata to ensure persona for.
 *
 * @example
 * ```ts
 * const oyakata = world.oyakata.get(oyakataId);
 * ensurePersonaForOyakata(world, oyakata);
 * console.log(oyakata.quirks); // Array of personality quirks
 * console.log(oyakata.managerFlags); // Behavioral flags
 * ```
 */
export function ensurePersonaForOyakata(world: WorldState, oyakata: Oyakata): void {
  if (Array.isArray(oyakata.quirks) && oyakata.quirks.length) return;

  const rng = rngForWorld(world, "oyakataPersona", oyakata.id);

  const baseCount = oyakata.archetype === "tyrant" || oyakata.archetype === "gambler" ? 3 : 2;
  const quirkIds = pickUnique(rng, QUIRK_IDS, baseCount);

  // Hydrate quirk labels via BardEngine
  const quirkLabels = quirkIds.map((id) => BardEngine.resolve(rng, `oyakata.quirks.${id}`).text);

  const flags = {
    welfareHawk: quirkIds.includes("Welfare Hawk") || oyakata.traits.compassion >= 75,
    disciplineHawk:
      quirkIds.includes("Discipline Hawk") ||
      oyakata.archetype === "tyrant" ||
      oyakata.traits.tradition >= 80,
    publicityHawk: quirkIds.includes("Media Operator") || oyakata.traits.ambition >= 80,
    nepotist: quirkIds.includes("Nepotist"),
  };

  oyakata.quirks = quirkLabels;
  oyakata.managerFlags = flags;
}

/**
 * Project a manager's full persona for decision making.
 * Combines archetype, traits, quirks, and heya context into a decision-making profile.
 *
 * @param {WorldState} world - The current world state.
 * @param {string} heyaId - The heya ID to get persona for.
 * @returns {NPCPersona} The complete persona profile for decision making.
 *
 * @example
 * ```ts
 * const persona = getManagerPersona(world, heyaId);
 * if (persona.flags.welfareHawk) {
 *   // Manager prioritizes rikishi welfare over training
 * }
 * if (persona.riskAppetite > 0.7) {
 *   // Manager is willing to take risks in recruitment
 * }
 * ```
 */
export function getManagerPersona(world: WorldState, heyaId: string): NPCPersona {
  const heya = getHeya(world, heyaId);
  const oyakata = getOyakataForHeya(world, heyaId);
  const perception = getCachedPerception(world, heyaId);

  if (!heya || !oyakata) {
    return {
      archetype: "unknown",
      traits: { ambition: 50, patience: 50, risk: 50, tradition: 50, compassion: 50 },
      quirks: [],
      flags: { welfareHawk: false, disciplineHawk: false, publicityHawk: false, nepotist: false },
      styleBias: "neutral",
      welfareDiscipline: 0.4,
      riskAppetite: 0.5,
      perception,
      mood: "content" as OyakataMood,
    };
  }

  ensurePersonaForOyakata(world, oyakata);

  const traits = oyakata.traits;
  const flags = {
    welfareHawk: Boolean(oyakata.managerFlags?.welfareHawk),
    disciplineHawk: Boolean(oyakata.managerFlags?.disciplineHawk),
    publicityHawk: Boolean(oyakata.managerFlags?.publicityHawk),
    nepotist: Boolean(oyakata.managerFlags?.nepotist),
  };

  const welfareDiscipline = Math.max(
    0,
    Math.min(1, traits.compassion / 120 + (flags.welfareHawk ? 0.25 : 0) - traits.risk / 220)
  );

  const riskAppetite = Math.max(
    0,
    Math.min(1, (traits.risk / 100) * 0.65 + (traits.ambition / 100) * 0.35)
  );

  return {
    archetype: oyakata.archetype,
    traits,
    quirks: oyakata.quirks ?? [],
    flags,
    styleBias: getHeyaStyleBias(world, heyaId),
    welfareDiscipline,
    riskAppetite,
    perception,
    mood: (oyakata.mood ?? "content") as OyakataMood,
  };
}
