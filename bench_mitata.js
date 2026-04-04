import { run, bench, group } from 'mitata';

const arr = Array.from({ length: 100 }, (_, i) => ({ kind: 'generic', title: 'title' }));
const KIND_ICON = { generic: 'icon' };
const KIND_COLOR = { generic: 'color' };

group('slice vs map', () => {
  bench('slice.map', () => {
    return arr.slice(0, 4).map(item => {
      const Icon = KIND_ICON[item.kind] ?? 'fallback_icon';
      const color = KIND_COLOR[item.kind] ?? "text-muted-foreground";
      return { Icon, color, item };
    });
  });

  bench('IIFE for loop preallocated', () => {
    const limit = Math.min(arr.length, 4);
    const result = new Array(limit);
    for (let i = 0; i < limit; i++) {
      const item = arr[i];
      const Icon = KIND_ICON[item.kind] ?? 'fallback_icon';
      const color = KIND_COLOR[item.kind] ?? "text-muted-foreground";
      result[i] = { Icon, color, item };
    }
    return result;
  });

  bench('IIFE push', () => {
    const limit = Math.min(arr.length, 4);
    const result = [];
    for (let i = 0; i < limit; i++) {
      const item = arr[i];
      const Icon = KIND_ICON[item.kind] ?? 'fallback_icon';
      const color = KIND_COLOR[item.kind] ?? "text-muted-foreground";
      result.push({ Icon, color, item });
    }
    return result;
  });
});

await run();
