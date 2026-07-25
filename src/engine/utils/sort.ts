export function stableSort<T>(iterable: Iterable<T> | ArrayLike<T>, keyFn: (x: T) => string): T[] {
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

/**
 * Sort standings entries by wins descending, then losses ascending.
 * An optional tieBreak function is used as the third comparator.
 * Does not mutate the input array.
 */
export function sortStandings<T extends { wins: number; losses: number }>(
  entries: T[],
  tieBreak?: (a: T, b: T) => number
): T[] {
  const sorted = [...entries];
  sorted.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (a.losses !== b.losses) return a.losses - b.losses;
    return tieBreak ? tieBreak(a, b) : 0;
  });
  return sorted;
}
