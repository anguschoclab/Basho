import { projectHeya } from './src/presenters/heyaUI';
import type { Heya } from './src/engine/types/heya';
import { WorldState } from './src/engine/types/world';
import { Rikishi } from './src/engine/types/rikishi';

const h: Heya = {
  id: 'heya_1',
  name: 'Test Heya',
  rikishiIds: Array.from({ length: 100 }, (_, i) => `rikishi_${i}`),
  prestige: 50,
  location: 'Tokyo',
  ichimon: 'Independent',
} as Heya;

const world = {
  rikishi: new Map<string, Rikishi>(),
  staff: new Map(),
} as unknown as WorldState;

for (let i = 0; i < 100; i++) {
  world.rikishi.set(`rikishi_${i}`, { id: `rikishi_${i}`, shikona: `Test ${i}` } as Rikishi);
}

const N = 10000;

console.time('baseline');
for (let i = 0; i < N; i++) {
  const roster = (h.rikishiIds || [])
    .map(id => world.rikishi.get(id))
    .filter((r): r is import("./src/engine/types/rikishi").Rikishi => r !== undefined)
    .map(r => ({ id: r.id, name: r.shikona } as any));
}
console.timeEnd('baseline');

console.time('reduce');
for (let i = 0; i < N; i++) {
  const roster = (h.rikishiIds || []).reduce<any[]>((acc, id) => {
    const r = world.rikishi.get(id);
    if (r !== undefined) {
      acc.push({ id: r.id, name: r.shikona });
    }
    return acc;
  }, []);
}
console.timeEnd('reduce');

console.time('for-of');
for (let i = 0; i < N; i++) {
  const roster: any[] = [];
  for (const id of (h.rikishiIds || [])) {
    const r = world.rikishi.get(id);
    if (r !== undefined) {
      roster.push({ id: r.id, name: r.shikona });
    }
  }
}
console.timeEnd('for-of');

console.time('for-loop');
for (let i = 0; i < N; i++) {
  const roster: any[] = [];
  const ids = h.rikishiIds || [];
  for (let j = 0; j < ids.length; j++) {
    const r = world.rikishi.get(ids[j]);
    if (r !== undefined) {
      roster.push({ id: r.id, name: r.shikona });
    }
  }
}
console.timeEnd('for-loop');
