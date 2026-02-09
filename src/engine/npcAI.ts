// npcAI.ts
// =======================================================
// NPC Manager AI & Personas (Canon A7/A8/A11)
// - Deterministic Oyakata persona quirks + operational modifiers
// - Provides helpers used by TalentPool, Welfare, and Training systems
// =======================================================

import { rngForWorld } from "./rng";
import type { WorldState, Style, OyakataArchetype, Oyakata } from "./types";
import { ensureHeyaTrainingState, type TrainingIntensity } from "./training";

export function determineNPCStyleBias(world: WorldState, stableId: string): Style | "neutral" {
  const stable = world.heyas.get(stableId);
  if (!stable) return "neutral";

  let oshi = 0;
  let yotsu = 0;

  for (const rId of stable.rikishiIds) {
    const rikishi = world.rikishi.get(rId);
    if (!rikishi) continue;
    if (rikishi.style === "oshi") oshi += 1;
    if (rikishi.style === "yotsu") yotsu += 1;
  }

  if (oshi === yotsu) return "neutral";
  return oshi > yotsu ? "oshi" : "yotsu";
}

const QUIRK_POOL = [
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
  "Numbers Guy"
] as const;

function pickUnique<T>(rng: { next: () => number }, items: readonly T[], count: number): T[] {
  const pool = [...items];
  const out: T[] = [];
  while (pool.length && out.length < count) {
    const idx = Math.floor(rng.next() * pool.length);
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}

function ensurePersonaForOyakata(world: WorldState, oyakata: Oyakata): void {
  if (Array.isArray(oyakata.quirks) && oyakata.quirks.length) return;

  const rng = rngForWorld(world, "oyakataPersona", oyakata.id);

  // More extreme archetypes get more quirks
  const baseCount = oyakata.archetype === "tyrant" || oyakata.archetype === "gambler" ? 3 : 2;
  const quirks = pickUnique(rng, QUIRK_POOL, baseCount);

  const flags = {
    welfareHawk: quirks.includes("Welfare Hawk") || oyakata.traits.compassion >= 75,
    disciplineHawk: quirks.includes("Discipline Hawk") || oyakata.archetype === "tyrant" || oyakata.traits.tradition >= 80,
    publicityHawk: quirks.includes("Media Operator") || oyakata.traits.ambition >= 80,
    nepotist: quirks.includes("Nepotist")
  };

  oyakata.quirks = quirks as unknown as string[];
  oyakata.managerFlags = flags;
}

export function getManagerPersona(world: WorldState, heyaId: string): {
  archetype: OyakataArchetype | "unknown";
  traits: { ambition: number; patience: number; risk: number; tradition: number; compassion: number };
  quirks: string[];
  flags: { welfareHawk: boolean; disciplineHawk: boolean; publicityHawk: boolean; nepotist: boolean };
  styleBias: Style | "neutral";
  /** 0..1: how aggressively they manage welfare risk */
  welfareDiscipline: number;
  /** 0..1: how hard they push intensity/risk */
  riskAppetite: number;
} {
  const heya = world.heyas.get(heyaId);
  const oyakata = heya ? world.oyakata.get(heya.oyakataId) : undefined;

  if (!heya || !oyakata) {
    return {
      archetype: "unknown",
      traits: { ambition: 50, patience: 50, risk: 50, tradition: 50, compassion: 50 },
      quirks: [],
      flags: { welfareHawk: false, disciplineHawk: false, publicityHawk: false, nepotist: false },
      styleBias: "neutral",
      welfareDiscipline: 0.4,
      riskAppetite: 0.5
    };
  }

  ensurePersonaForOyakata(world, oyakata);

  const traits = oyakata.traits;
  const flags = {
    welfareHawk: Boolean(oyakata.managerFlags?.welfareHawk),
    disciplineHawk: Boolean(oyakata.managerFlags?.disciplineHawk),
    publicityHawk: Boolean(oyakata.managerFlags?.publicityHawk),
    nepotist: Boolean(oyakata.managerFlags?.nepotist)
  };

  const welfareDiscipline =
    Math.max(0, Math.min(1,
      (traits.compassion / 120) +
      (flags.welfareHawk ? 0.25 : 0) -
      (traits.risk / 220)
    ));

  const riskAppetite =
    Math.max(0, Math.min(1,
      (traits.risk / 100) * 0.65 +
      (traits.ambition / 100) * 0.35
    ));

  return {
    archetype: oyakata.archetype,
    traits,
    quirks: oyakata.quirks ?? [],
    flags,
    styleBias: determineNPCStyleBias(world, heyaId),
    welfareDiscipline,
    riskAppetite
  };
}

/**
 * tickWeek(world)
 * Enforces compliance sanctions against NPC stables automatically:
 * - training intensity caps
 */
export function tickWeek(world: WorldState): void {
  for (const heya of world.heyas.values()) {
    const welfare = (heya as any).welfareState;
    const cap: TrainingIntensity | undefined = welfare?.sanctions?.trainingIntensityCap;

    if (cap) {
      const state = ensureHeyaTrainingState(world, heya.id);
      const current = state.activeProfile.intensity;

      const rank = (x: TrainingIntensity) => (x === "low" ? 0 : x === "medium" ? 1 : 2);
      if (rank(current) > rank(cap)) {
        state.activeProfile = { ...state.activeProfile, intensity: cap };
      }
    }
  }
}
