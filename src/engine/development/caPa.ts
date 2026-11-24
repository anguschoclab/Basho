/**
 * caPa.ts — FM-style Current Ability / Potential Ability on a 0–200 scale.
 * =====================================================================
 *
 * A single derived layer over the 8 trainable stats — the same numbers FM
 * calls CA and PA. Both are DERIVED, never stored: CA is a weighted mean of
 * the current stat sheet, PA is the same weighting applied to the hidden
 * `potential.stats` ceiling times `ceilingFraction`.
 *
 * Weights are balanced across the trainable set — effectiveness in the bout
 * engine is archetype-dependent (a yotsu specialist leans on belt/power,
 * an oshi specialist on speed/aggression), so no stat is worth zero and the
 * big three (power/technique/speed) carry a mild emphasis. Mass contributes
 * a modest share (archetypes weigh it 0.85–1.3 in matchups); experience is
 * excluded as a function of tenure not ability.
 *
 * Fog-of-war: these are the TRUE values. Players and NPCs see them only
 * through perceivedCA/perceivedPA (star bands), never raw — the same noisy
 * lens for every observer.
 */
import type { Rikishi, RikishiStats } from "@/engine/types/rikishi";

/** The 8 trainable stats — weight and experience excluded by design. */
export const TRAINABLE_STAT_KEYS = [
  "power",
  "technique",
  "speed",
  "stamina",
  "mental",
  "adaptability",
  "balance",
  "aggression",
] as const;
export type TrainableStatKey = (typeof TRAINABLE_STAT_KEYS)[number];

/** CA weighting — big-three skills carry the largest share. The trainable
 *  set sums to 0.88; physique (mass) takes the remaining 0.12 — sumo is a
 *  contact sport and a 95kg prospect cannot use his skill against 160kg
 *  men yet, so an underdeveloped frame drags effective CA below the skill
 *  sheet exactly like a missing stat would. */
export const CA_STAT_WEIGHTS: Record<TrainableStatKey, number> = {
  power: 0.176,
  technique: 0.176,
  speed: 0.132,
  balance: 0.106,
  mental: 0.106,
  stamina: 0.07,
  adaptability: 0.062,
  aggression: 0.052,
};

/** Competitive mass band → 0–100. Enho-scale lightness (~99kg) reads ~8;
 *  a 180kg ozeki frame reads ~75. Below-band mass still counts a little —
 *  being light hurts but isn't zero. */
export const MASS_NORM_MIN_KG = 90;
export const MASS_NORM_MAX_KG = 210;
export const MASS_CA_SHARE = 0.12;

export function massScore(weightKg: number | undefined): number {
  if (weightKg == null || !Number.isFinite(weightKg)) return 0;
  return Math.max(0, Math.min(100, ((weightKg - MASS_NORM_MIN_KG) / (MASS_NORM_MAX_KG - MASS_NORM_MIN_KG)) * 100));
}

function weightedMean(stats: Partial<RikishiStats> | undefined): number {
  let acc = 0;
  for (const k of TRAINABLE_STAT_KEYS) acc += ((stats?.[k] as number | undefined) ?? 0) * CA_STAT_WEIGHTS[k];
  return acc + massScore(stats?.weight) * MASS_CA_SHARE; // 0–100 scale
}

const clamp200 = (v: number) => Math.max(0, Math.min(200, v));

/** Current Ability — weighted mean of the trainable stats scaled to 0–200.
 *  Accepts any stat-sheet carrier: a live Rikishi or a CareerSnapshot's
 *  stored `stats` block (for progression charts). */
export function currentAbility(r: { stats?: RikishiStats }): number {
  return Math.round(clamp200(weightedMean(r.stats) * 2));
}

/**
 * Potential Ability — the hidden ceiling on the same scale: weighted
 * potential.stats × ceilingFraction × 2. PA never reads below CA (a rikishi
 * who met his ceiling has realized his potential); a missing potential
 * block means no headroom beyond the present.
 */
export function potentialAbility(r: Rikishi): number {
  if (!r.potential?.stats) return currentAbility(r);
  // potential.stats.weight is a 0 placeholder — the real PA frame lives on
  // potential.weightKg; inject it so PA prices in the adult physique the
  // same way CA prices the current one.
  const paStats = { ...r.potential.stats, weight: r.potential.weightKg } as RikishiStats;
  const raw = weightedMean(paStats) * (r.potential.ceilingFraction ?? 1) * 2;
  return Math.round(clamp200(Math.max(raw, currentAbility(r))));
}

/** 0–200 ability → 0–5 stars in half-star steps (FM convention). */
export function abilityToStars(ability: number): number {
  const clamped = Math.max(0, Math.min(200, ability));
  return Math.round((clamped / 20)) / 2;
}
