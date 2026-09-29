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
  // pick one active makuuchi rikishi
  const target = [...world.rikishi.values()].find(r => r.division === "makuuchi");
  if (!target) throw new Error("no makuuchi rikishi in generated world");
  for (let b = 0; b < 4; b++) {
    let g = 0;
    while (world.cyclePhase !== "active_basho" && g++ < 60) world = advanceDaysFast(world, 7, { autonomous: true });
    g = 0;
    while (world.cyclePhase === "active_basho" && (world.currentBasho?.day ?? 0) <= 15 && g++ < 10) world = advanceDaysFast(world, 7, { autonomous: true });
    let w = endBasho(world);
    w = resolveImpacts(w, [publishBanzukeUpdate(w)]);
    world = w;
    const r = world.rikishi.get(target.id);
    if (!r) throw new Error(`target rikishi ${target.id} missing from world`);
    const fields: [string, number][] = Object.entries(r).map(([k, v]) => {
      try { return [k, JSON.stringify(v).length] as [string, number]; } catch { return [k, 0] as [string, number]; }
    }).sort((a, b) => b[1] - a[1]);
    console.log(`=== ${r.shikona} after basho ${b + 1} (total ${(JSON.stringify(r).length / 1024).toFixed(0)}KB) ===`);
    for (const [k, n] of fields.slice(0, 8)) console.log(`  ${k}: ${(n / 1024).toFixed(1)}KB`);
  }
}
main();
