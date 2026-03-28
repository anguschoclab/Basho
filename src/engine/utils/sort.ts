export function stableSort<T>(iterable: Iterable<T>, keyFn: (x: T) => string | number): T[] {
  return Array.from(iterable).sort((a, b) => {
    const ka = keyFn(a);
    const kb = keyFn(b);
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  });
}

export function stableTieBreak(a: string | number, b: string | number): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}
