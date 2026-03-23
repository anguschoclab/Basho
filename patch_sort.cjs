const fs = require('fs');
const path = './src/engine/utils/sort.ts';

const content = `export function stableSort<T>(arr: T[], keyFn: (x: T) => string): T[] { return [...arr].sort((a, b) => {
  const ka = keyFn(a);
  const kb = keyFn(b);
  return ka < kb ? -1 : ka > kb ? 1 : 0;
}); }

export function stableTieBreak(a: string | number, b: string | number): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}`;

fs.writeFileSync(path, content);
console.log('Sort patched');
