import { bench, run } from "mitata";

interface UIRosterEntry {
  id: string;
  isInjured: boolean;
  fatigue: number;
}

function generateRoster(size: number): UIRosterEntry[] {
  const roster: UIRosterEntry[] = [];
  for (let i = 0; i < size; i++) {
    roster.push({
      id: `rikishi-${i}`,
      isInjured: Math.random() < 0.1, // 10% chance
      fatigue: Math.floor(Math.random() * 100),
    });
  }
  return roster;
}

const smallRoster = generateRoster(10);
const mediumRoster = generateRoster(100);
const largeRoster = generateRoster(1000);

function originalImpl(roster: UIRosterEntry[]) {
  const injuredCount = roster.filter(r => r.isInjured).length;
  const avgFatigue = roster.length ? Math.round(roster.reduce((s, r) => s + r.fatigue, 0) / roster.length) : 0;
  return { injuredCount, avgFatigue };
}

function optimizedImpl(roster: UIRosterEntry[]) {
  let injuredCount = 0;
  let totalFatigue = 0;
  for (let i = 0; i < roster.length; i++) {
    const r = roster[i];
    if (r.isInjured) injuredCount++;
    totalFatigue += r.fatigue;
  }
  const avgFatigue = roster.length ? Math.round(totalFatigue / roster.length) : 0;
  return { injuredCount, avgFatigue };
}

bench("Original (Small: 10)", () => {
  originalImpl(smallRoster);
});

bench("Optimized (Small: 10)", () => {
  optimizedImpl(smallRoster);
});

bench("Original (Medium: 100)", () => {
  originalImpl(mediumRoster);
});

bench("Optimized (Medium: 100)", () => {
  optimizedImpl(mediumRoster);
});

bench("Original (Large: 1000)", () => {
  originalImpl(largeRoster);
});

bench("Optimized (Large: 1000)", () => {
  optimizedImpl(largeRoster);
});

await run();
