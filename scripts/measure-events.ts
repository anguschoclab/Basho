import { generateInitialWorld } from "../src/engine/systems/generation/WorldFactory";
import { advanceDaysFast } from "../src/engine/tick/tickDaily";
import { endBasho, publishBanzukeUpdate } from "../src/engine/world";
import { resolveImpacts } from "../src/engine/core/ImpactResolver";
import { BardEngine } from "../src/engine/bard/BardEngine";

const SEED = "e2e-year-of-bashos-v1";
async function main() {
  await BardEngine.loadDomains();
  let world = generateInitialWorld(SEED);
  world = { ...world, playerHeyaId: world.heyas.keys().next().value };
  for (let b = 0; b < 3; b++) {
    let g = 0;
    while (world.cyclePhase !== "active_basho" && g++ < 60) world = advanceDaysFast(world, 7, { autonomous: true });
    g = 0;
    while (world.cyclePhase === "active_basho" && (world.currentBasho?.day ?? 0) <= 15 && g++ < 10) world = advanceDaysFast(world, 7, { autonomous: true });
    let w = endBasho(world);
    w = resolveImpacts(w, [publishBanzukeUpdate(w)]);
    world = w;
  }
  const counts = new Map<string, number>();
  const bytes = new Map<string, number>();
  for (const e of world.events.log) {
    const k = `${e.type}/${e.category}`;
    counts.set(k, (counts.get(k) ?? 0) + 1);
    bytes.set(k, (bytes.get(k) ?? 0) + JSON.stringify(e).length);
  }
  const sorted = [...bytes.entries()].sort((a, b) => b[1] - a[1]);
  console.log(`total events: ${world.events.log.length}`);
  for (const [k, n] of sorted.slice(0, 15)) console.log(`  ${k}: n=${counts.get(k)} bytes=${(n / 1048576).toFixed(1)}MB`);
}
main();
