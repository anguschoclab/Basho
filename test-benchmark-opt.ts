import { WorldState } from "./src/engine/types/world";
import { projectHeya } from "./src/presenters/heyaUI";

// create mock world
const world = {
  staff: new Map(),
  rikishi: new Map(),
  heyas: new Map(),
  oyakata: new Map(),
} as any;

for (let i = 0; i < 10000; i++) {
  world.staff.set(`staff_${i}`, {
    id: `staff_${i}`,
    name: `Name ${i}`,
    role: `Role ${i}`,
    heyaId: `heya_${i % 10}`,
  });
}

world.heyas.set("heya_5", {
  id: "heya_5",
  name: "Test Heya",
  oyakataId: "oyakata_1",
});

world.oyakata.set("oyakata_1", {
  id: "oyakata_1",
  shikona: "Oyakata Name",
});

const heya = {
  id: "heya_5",
  name: "Test Heya",
} as any;

export function projectHeyaOpt(h: any, world: any): any {
  const staff = [];
  for (const s of world.staff.values()) {
    if (s.heyaId === h.id) {
      staff.push({
        id: s.id,
        name: s.name,
        role: s.role,
        specialty: (s as any).specialty || "General"
      });
    }
  }

  // just a dummy return to match the loop cost we are checking
  return {
    staff
  };
}

export function projectHeyaBaseline(h: any, world: any): any {
  const staff = Array.from(world.staff.values())
    .filter(s => s.heyaId === h.id)
    .map(s => ({
      id: s.id,
      name: s.name,
      role: s.role,
      specialty: (s as any).specialty || "General"
    }));

  return {
    staff
  };
}

// warmup
for (let i = 0; i < 100; i++) {
  projectHeyaBaseline(heya, world);
  projectHeyaOpt(heya, world);
}

const start = performance.now();
for (let i = 0; i < 1000; i++) {
  projectHeyaBaseline(heya, world);
}
const end = performance.now();

console.log(`Baseline Time: ${end - start}ms`);

const startOpt = performance.now();
for (let i = 0; i < 1000; i++) {
  projectHeyaOpt(heya, world);
}
const endOpt = performance.now();

console.log(`Optimized Time: ${endOpt - startOpt}ms`);
