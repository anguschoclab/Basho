export function stableSort<T>(arr: T[], keyFn: (x: T) => string): T[] { return [...arr].sort((a, b) => { const ka = keyFn(a); const kb = keyFn(b); return ka < kb ? -1 : ka > kb ? 1 : 0; }); }

export function stableTieBreak(a: string | number, b: string | number): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
