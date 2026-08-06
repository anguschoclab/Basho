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
import { BardEngine } from "../bard/BardEngine";
import {
  DEFAULT_WELFARE_DISCIPLINE,
  DEFAULT_RISK_APPETITE,
  COMPASSION_WELFARE_DIVISOR,
  WELFARE_HAWK_BONUS,
  RISK_WELFARE_DIVISOR,
  RISK_MULTIPLIER,
  AMBITION_MULTIPLIER,
  WELFARE_HAWK_COMPASSION_THRESHOLD,
  DISCIPLINE_HAWK_TRADITION_THRESHOLD,
  PUBLICITY_HAWK_AMBITION_THRESHOLD,
  QUIRK_COUNT_HIGH,
  QUIRK_COUNT_BASE,
} from "../../constants/engine/npcStrategy";

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

export interface OyakataPersona {
  quirks: string[];
  managerFlags: NonNullable<Oyakata["managerFlags"]>;
}

/**
 * Ensure an Oyakata has a defined persona (quirks and flags).
 * Generates quirks and behavioral flags if not already present.
 * Returns the persona data without mutating the input oyakata.
 *
 * @param {WorldState} world - The current world state.
 * @param {Oyakata} oyakata - The oyakata to ensure persona for.
 * @returns {OyakataPersona} The persona data (quirks and managerFlags).
 */
export function ensurePersonaForOyakata(
  world: WorldState,
  oyakata: Oyakata
): OyakataPersona {
  if (Array.isArray(oyakata.quirks) && oyakata.quirks.length) {
    return {
      quirks: oyakata.quirks,
      managerFlags: oyakata.managerFlags ?? {
        welfareHawk: false,
        disciplineHawk: false,
        publicityHawk: false,
        nepotist: false,
      },
    };
  }

  const rng = rngForWorld(world, "oyakataPersona", oyakata.id);

  const baseCount = oyakata.archetype === "tyrant" || oyakata.archetype === "gambler" ? QUIRK_COUNT_HIGH : QUIRK_COUNT_BASE;
  const quirkIds = pickUnique(rng, QUIRK_IDS, baseCount);

  // Hydrate quirk labels via BardEngine
  const quirkLabels = quirkIds.map((id) => BardEngine.resolve(rng, `oyakata.quirks.${id}`).text);

  const flags = {
    welfareHawk: quirkIds.includes("Welfare Hawk") || oyakata.traits.compassion >= WELFARE_HAWK_COMPASSION_THRESHOLD,
    disciplineHawk:
      quirkIds.includes("Discipline Hawk") ||
      oyakata.archetype === "tyrant" ||
      oyakata.traits.tradition >= DISCIPLINE_HAWK_TRADITION_THRESHOLD,
    publicityHawk: quirkIds.includes("Media Operator") || oyakata.traits.ambition >= PUBLICITY_HAWK_AMBITION_THRESHOLD,
    nepotist: quirkIds.includes("Nepotist"),
  };

  return { quirks: quirkLabels, managerFlags: flags };
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
      welfareDiscipline: DEFAULT_WELFARE_DISCIPLINE,
      riskAppetite: DEFAULT_RISK_APPETITE,
      perception,
      mood: "content" as OyakataMood,
    };
  }

  const persona = ensurePersonaForOyakata(world, oyakata);

  const traits = oyakata.traits;
  const flags = {
    welfareHawk: Boolean(persona.managerFlags?.welfareHawk),
    disciplineHawk: Boolean(persona.managerFlags?.disciplineHawk),
    publicityHawk: Boolean(persona.managerFlags?.publicityHawk),
    nepotist: Boolean(persona.managerFlags?.nepotist),
  };

  const welfareDiscipline = Math.max(
    0,
    Math.min(1, traits.compassion / COMPASSION_WELFARE_DIVISOR + (flags.welfareHawk ? WELFARE_HAWK_BONUS : 0) - traits.risk / RISK_WELFARE_DIVISOR)
  );

  const riskAppetite = Math.max(
    0,
    Math.min(1, (traits.risk / 100) * RISK_MULTIPLIER + (traits.ambition / 100) * AMBITION_MULTIPLIER)
  );

  return {
    archetype: oyakata.archetype,
    traits,
    quirks: persona.quirks,
    flags,
    styleBias: getHeyaStyleBias(world, heyaId),
    welfareDiscipline,
    riskAppetite,
    perception,
    mood: (oyakata.mood ?? "content") as OyakataMood,
  };
}
