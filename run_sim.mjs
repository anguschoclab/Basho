import { advanceOneDay } from "./src/engine/dailyTick.ts";
import { serializeWorld } from "./src/engine/saveload.ts";
import { generateWorld } from "./src/engine/worldgen.ts";
import crypto from "crypto";

function hashWorld(world) {
  const json = JSON.stringify(serializeWorld(world));
  return crypto.createHash('sha256').update(json).digest('hex');
}

function runSim() {
  const world = generateWorld("test_seed");
  for (let i = 0; i < 100; i++) {
    advanceOneDay(world);
  }
  return hashWorld(world);
}

const hash1 = runSim();
const hash2 = runSim();

console.log("Hash 1:", hash1);
console.log("Hash 2:", hash2);
if (hash1 !== hash2) {
  console.error("STATE LEAK DETECTED!");
  process.exit(1);
} else {
  console.log("Determinism test passed.");
}
