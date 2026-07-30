/**
 * PreSumoBackground.ts
 * ====================
 * Assigns a pre-sumo athletic background to new rikishi at recruitment.
 * Each background provides small stat modifiers that differentiate recruits
 * and create narrative flavor.
 */

import type { Rikishi } from "../../types/rikishi";
import type { SeededRNG } from "../../rng";
import { clampInt } from "../../utils/math";

export type PreSumoBackgroundId =
  | "gymnast"
  | "judoka"
  | "baseball"
  | "soccer"
  | "wrestler"
  | "track"
  | "none";

interface BackgroundDef {
  id: PreSumoBackgroundId;
  weight: number;
  statModifiers: {
    power?: number;
    speed?: number;
    technique?: number;
    balance?: number;
    stamina?: number;
  };
}

export const PRE_SUMO_BACKGROUNDS: BackgroundDef[] = [
  { id: "gymnast", weight: 10, statModifiers: { speed: 3, balance: 3 } },
  { id: "judoka", weight: 10, statModifiers: { technique: 3 } },
  { id: "baseball", weight: 10, statModifiers: { power: 3 } },
  { id: "soccer", weight: 10, statModifiers: { stamina: 3 } },
  { id: "wrestler", weight: 10, statModifiers: { power: 2, technique: 2 } },
  { id: "track", weight: 10, statModifiers: { stamina: 2, speed: 2 } },
  { id: "none", weight: 40, statModifiers: {} },
];

const STAT_MIN = 10;
const STAT_MAX = 100;

/**
 * Deterministically assigns a pre-sumo background based on RNG.
 * Weighted selection — "none" is the most common (40%).
 */
export function assignPreSumoBackground(rng: SeededRNG): PreSumoBackgroundId {
  const totalWeight = PRE_SUMO_BACKGROUNDS.reduce((sum, b) => sum + b.weight, 0);
  const roll = rng.next() * totalWeight;
  let acc = 0;
  for (const bg of PRE_SUMO_BACKGROUNDS) {
    acc += bg.weight;
    if (roll < acc) return bg.id;
  }
  return "none";
}

/**
 * Applies stat modifiers for a given pre-sumo background to a rikishi.
 * Returns a new rikishi object with updated stats and preSumoBackground field.
 */
export function applyBackgroundStatModifiers(
  rikishi: Rikishi,
  background: PreSumoBackgroundId
): Rikishi {
  const def = PRE_SUMO_BACKGROUNDS.find((b) => b.id === background);
  if (!def) return rikishi;

  const mods = def.statModifiers;
  const stats = { ...rikishi.stats };

  if (mods.power) stats.power = clampInt(stats.power + mods.power, STAT_MIN, STAT_MAX);
  if (mods.speed) stats.speed = clampInt(stats.speed + mods.speed, STAT_MIN, STAT_MAX);
  if (mods.technique) stats.technique = clampInt(stats.technique + mods.technique, STAT_MIN, STAT_MAX);
  if (mods.balance) stats.balance = clampInt(stats.balance + mods.balance, STAT_MIN, STAT_MAX);
  if (mods.stamina) stats.stamina = clampInt(stats.stamina + mods.stamina, STAT_MIN, STAT_MAX);

  return {
    ...rikishi,
    stats,
    preSumoBackground: background,
  };
}
