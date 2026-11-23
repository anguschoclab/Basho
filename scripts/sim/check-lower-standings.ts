import { generateInitialWorld } from "@/engine/generation/WorldFactory";
import { simulateEntireBasho } from "@/engine/simulation/TournamentSimulator";

const { BardEngine } = await import("@/engine/bard/BardEngine");
await BardEngine.loadDomains();

let world = generateInitialWorld("sim-25yr-diagnostic-v1");
world = { ...world, playerHeyaId: undefined };
const sim = simulateEntireBasho(world, "hatsu", "probe-1");
const basho = sim.finalWorld.currentBasho;
if (!basho) { console.log("no basho"); process.exit(1); }
const matches = basho.matches ?? [];
const perDivPerDay: Record<string, Record<number, [number, number]>> = {};
for (const m of matches) {
  const e = world.rikishi.get(m.eastRikishiId);
  const d = m.isMaezumoBout ? "maezumo" : (e?.division ?? "?");
  perDivPerDay[d] ??= {};
  const cell = (perDivPerDay[d][m.day] ??= [0, 0]);
  cell[0]++;
  if (m.result) cell[1]++;
}
for (const [d, days] of Object.entries(perDivPerDay).sort()) {
  const summary = Object.entries(days).map(([day, [n, res]]) => `d${day}:${n}/${res}`).join(" ");
  console.log(d.padEnd(10), summary);
}
console.log("total matches:", matches.length);
