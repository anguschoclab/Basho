export function pick<T>(arr: readonly T[], rng: () => number): T { return arr[Math.floor(rng() * arr.length)]; }
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
