/**
 * Creates a deterministic random number generator (LCG) from a string seed.
 * Replaces external seedrandom dependencies.
 *
 * @param seed - The string seed (e.g., combination of world seed, heya, nationality).
 * @returns A function that returns deterministic pseudo-random numbers between 0 and 1.
 */
export function seededRandom(seed: string): () => number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const a = 1664525;
  const c = 1013904223;
  const m = 4294967296;
  let x = Math.abs(hash);

  return function () {
    x = (a * x + c) % m;
    return x / m;
  };
}
