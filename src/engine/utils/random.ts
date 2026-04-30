/**
 * Centralized, deterministic random helpers.
 * For use with the engine's SeededRNG only.
 */

import { SeededRNG } from "../rng";

/**
 * Standardizes the 'pick one' pattern.
 */
export function seededPick<T>(rng: SeededRNG, arr: readonly T[]): T {
  if (arr.length === 0) throw new Error("seededPick: Cannot pick from empty array.");
  return arr[rng.int(0, arr.length - 1)];
}

/**
 * Back-compat alias for 'getRandom' used in legacy worldgen and npcAIs.
 */
export const getRandom = seededPick;

/**
 * Standardizes 'weighted pick' for logic like injury types or archetypes.
 */
export function seededWeightedPick<T>(
  rng: SeededRNG,
  items: readonly { item: T; weight: number }[]
): T {
  const totalWeight = items.reduce((sum, i) => sum + i.weight, 0);
  let r = rng.next() * totalWeight;
  for (const { item, weight } of items) {
    if (r < weight) return item;
    r -= weight;
  }
  return items[items.length - 1].item;
}

/**
 * Procedural random wrapper for simple uses.
 */
export function pick<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

export function weightedPick<T>(items: Array<{ item: T; w: number }>, rng: () => number): T {
  const total = items.reduce((s, x) => s + Math.max(0, x.w), 0);
  if (total <= 0) return items[0].item;
  let r = rng() * total;
  for (const x of items) {
    r -= Math.max(0, x.w);
    if (r <= 0) return x.item;
  }
  return items[items.length - 1].item;
}
