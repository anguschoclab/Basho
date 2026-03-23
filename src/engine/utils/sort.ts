/**
 * Deterministic string tie-breaker for use in Array.sort().
 * Avoids environment-dependent localeCompare to ensure absolute determinism.
 */
export function stableTieBreak(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * Deterministically sorts an array based on a string key derived from each element.
 */
export function stableSort<T>(arr: T[], keyFn: (x: T) => string): T[] {
  return [...arr].sort((a, b) => stableTieBreak(keyFn(a), keyFn(b)));
}
