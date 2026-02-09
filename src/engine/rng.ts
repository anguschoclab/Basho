// rng.ts
// =======================================================
// Canonical RNG helpers for engine code.
//
// Rule:
// - Always derive streams from an explicit seed (usually world.seed),
//   and namespace them with subsystem + label.
//
// Pattern:
//   rngFromSeed(seed, subsystem, label)
//
// Prefer these helpers instead of ad-hoc string concatenation.
// =======================================================

import seedrandom from "seedrandom";
import type { WorldState } from "./types";

/**
 * A lightweight seeded RNG wrapper with a common interface.
 */
export class SeededRNG {
  private rng: seedrandom.PRNG;
  
  constructor(seed: string) {
    this.rng = seedrandom(seed);
  }
  
  /** Returns a float in [0, 1) */
  next(): number {
    return this.rng();
  }
  
  /** Returns an integer in [min, max] inclusive */
  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
  
  /** Returns true with probability p */
  bool(p: number = 0.5): boolean {
    return this.next() < p;
  }
  
  /** Pick a random element from an array */
  pick<T>(arr: T[]): T {
    return arr[this.int(0, arr.length - 1)];
  }
  
  /** Shuffle an array in place */
  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}

export function rngFromSeed(seed: string, subsystem: string, label: string): SeededRNG {
  const combinedSeed = `${seed}::${subsystem}::${label}`;
  return new SeededRNG(combinedSeed);
}

export function rngForWorld(world: WorldState, subsystem: string, label: string): SeededRNG {
  return rngFromSeed(world.seed, subsystem, label);
}
