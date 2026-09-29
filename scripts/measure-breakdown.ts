import { generateInitialWorld } from "../src/engine/systems/generation/WorldFactory";
import { advanceDaysFast } from "../src/engine/tick/tickDaily";
import { endBasho, publishBanzukeUpdate } from "../src/engine/world";
import { resolveImpacts } from "../src/engine/core/ImpactResolver";
import { BardEngine } from "../src/engine/bard/BardEngine";
import { SerializationService } from "../src/engine/persistence/SerializationService";

const SEED = "e2e-year-of-bashos-v1";
async function main() {
  await BardEngine.loadDomains();
  let world = generateInitialWorld(SEED);
  world = { ...world, playerHeyaId: world.heyas.keys().next().value };
  for (let b = 0; b < 4; b++) {
    let g = 0;
    while (world.cyclePhase !== "active_basho" && g++ < 60) world = advanceDaysFast(world, 7, { autonomous: true });
    g = 0;
    while (world.cyclePhase === "active_basho" && (world.currentBasho?.day ?? 0) <= 15 && g++ < 10) world = advanceDaysFast(world, 7, { autonomous: true });
    let w = endBasho(world);
    w = resolveImpacts(w, [publishBanzukeUpdate(w)]);
    world = w;

    // breakdown of the serialized save (what the autosave writes)
    const save = SerializationService.serializeWorld(world) as unknown as Record<string, unknown>;
    const w2 = (save.world ?? save) as Record<string, unknown>;
    const parts: [string, number][] = [];
    for (const k of Object.keys(w2)) {
      try { parts.push([k, JSON.stringify(w2[k]).length]); } catch { parts.push([k, -1]); }
    }
    parts.sort((a, b) => b[1] - a[1]);
    console.log(`=== after basho ${b + 1}: top serialized fields (MB) ===`);
    for (const [k, n] of parts.slice(0, 8)) console.log(`  ${k}: ${(n / 1048576).toFixed(1)}`);
  }
}
main();
