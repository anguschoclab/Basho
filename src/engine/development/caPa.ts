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
 * big three (power/technique/speed) carry a mild emphasis. Weight and
 * experience are excluded: weight is physique not skill, experience is a
 * function of tenure not ability.
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

/** CA weighting — big-three skills carry the largest share. Sums to 1. */
export const CA_STAT_WEIGHTS: Record<TrainableStatKey, number> = {
  power: 0.2,
  technique: 0.2,
  speed: 0.15,
  balance: 0.12,
  mental: 0.12,
  stamina: 0.08,
  adaptability: 0.07,
  aggression: 0.06,
};

function weightedMean(stats: Partial<RikishiStats> | undefined): number {
  let acc = 0;
  for (const k of TRAINABLE_STAT_KEYS) acc += ((stats?.[k] as number | undefined) ?? 0) * CA_STAT_WEIGHTS[k];
  return acc; // 0–100 scale
}

const clamp200 = (v: number) => Math.max(0, Math.min(200, v));

/** Current Ability — weighted mean of the trainable stats scaled to 0–200. */
export function currentAbility(r: Rikishi): number {
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
  const raw = weightedMean(r.potential.stats) * (r.potential.ceilingFraction ?? 1) * 2;
  return Math.round(clamp200(Math.max(raw, currentAbility(r))));
}

/** 0–200 ability → 0–5 stars in half-star steps (FM convention). */
export function abilityToStars(ability: number): number {
  const clamped = Math.max(0, Math.min(200, ability));
  return Math.round((clamped / 20)) / 2;
}
