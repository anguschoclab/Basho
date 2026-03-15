export function stableSort<T>(arr: T[], keyFn: (x: T) => string): T[] { return [...arr].sort((a, b) => keyFn(a).localeCompare(keyFn(b))); }
