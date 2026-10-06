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
  for (let b = 0; b < 6; b++) {
    let g = 0;
    while (world.cyclePhase !== "active_basho" && g++ < 60)
      world = advanceDaysFast(world, 7, { autonomous: true });
    g = 0;
    while (world.cyclePhase === "active_basho" && (world.currentBasho?.day ?? 0) <= 15 && g++ < 10)
      world = advanceDaysFast(world, 7, { autonomous: true });
    const evLen = world.events?.log?.length ?? 0;
    const jsonBytes = JSON.stringify(world).length;
    const rss = process.memoryUsage().heapUsed / 1048576;
    console.log(
      `b${b + 1}: day=${world.dayIndexGlobal} events=${evLen} jsonMB=${(jsonBytes / 1048576).toFixed(1)} heapMB=${rss.toFixed(0)}`
    );
    let w = endBasho(world);
    w = resolveImpacts(w, [publishBanzukeUpdate(w)]);
    world = w;
  }
}
main();
