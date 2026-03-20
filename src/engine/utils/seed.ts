/**
 * Generates a cryptographically secure random hash for world seeds.
 * Returns a 6-character base-36 string prefixed with the provided string.
 *
 * @param prefix - The prefix for the generated seed (default: "world").
 * @returns A deterministic-friendly, unique seed string.
 */
export function makeDeterministicSeed(prefix = "world"): string {
  const array = new Uint32Array(1);
  globalThis.crypto.getRandomValues(array);
  const hash = array[0].toString(36).padStart(6, "0").slice(-6);
  return `${prefix}-${hash}`;
}
