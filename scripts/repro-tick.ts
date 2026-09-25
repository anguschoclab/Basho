import { generateInitialWorld } from "../src/engine/systems/generation/WorldFactory";
import { advanceDaysFastOrchestrator } from "../src/engine/tick/tickOrchestrator";
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

// measure serialized size
import { SerializationService } from "../src/engine/persistence/SerializationService";
const world2 = advanceDaysFastOrchestrator(world, 7);
const ser = JSON.stringify(SerializationService.serializeWorld(world2));
console.log("serialized world bytes:", ser.length);
const wrapped = JSON.stringify({ world: JSON.parse(ser) });
console.log("wrapped bytes:", wrapped.length);

const obj = SerializationService.serializeWorld(world2) as unknown as Record<string, unknown>;
const sizes = Object.entries(obj)
  .map(([k, v]) => [k, JSON.stringify(v)?.length ?? 0] as const)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 15);
console.log("field sizes:", sizes);
