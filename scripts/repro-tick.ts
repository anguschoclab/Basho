import { generateInitialWorld } from "../src/engine/systems/generation/WorldFactory";
import { advanceDaysFastOrchestrator, tickOrchestrator } from "../src/engine/tick/tickOrchestrator";
import { shouldHaltAdvance } from "../src/engine/loop/shouldHaltAdvance";

const seed = "e2e-basho-lifecycle-v1";
console.log("generating world...");
const world = generateInitialWorld(seed);
// mimic wizard: assign a player heya (first heya)
const firstHeya = [...world.heyas.keys()][0];
world.playerHeyaId = firstHeya;
console.log("world:", {
  seed: world.seed,
  day: world.dayIndexGlobal,
  week: world.week,
  phase: world.cyclePhase,
  playerHeyaId: world.playerHeyaId,
});

console.time("advance7");
try {
  const next = advanceDaysFastOrchestrator(world, 7);
  console.timeEnd("advance7");
  console.log("after:", {
    day: next.dayIndexGlobal,
    week: next.week,
    phase: next.cyclePhase,
    basho: next.currentBasho ? { day: next.currentBasho.day, name: next.currentBasho.bashoName } : null,
    halt: shouldHaltAdvance(next),
  });
} catch (e) {
  console.timeEnd("advance7");
  console.error("THREW:", e);
}
