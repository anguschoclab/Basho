import { generateWorld } from "./src/engine/worldgen.ts";
import { advanceDay } from "./src/engine/world.ts";
import { SeededRNG } from "./src/engine/rng.ts";
import fs from "fs";

async function run() {
  const world1 = generateWorld("test-seed");
  for (let i = 0; i < 30; i++) advanceDay(world1);
  const json1 = JSON.stringify(world1);

  const world2 = generateWorld("test-seed");
  for (let i = 0; i < 30; i++) advanceDay(world2);
  const json2 = JSON.stringify(world2);

  if (json1 === json2) {
      console.log("Determinism test passed for 30 days. State is reproducible.");
  } else {
      console.log("Determinism test failed. State is different.");
      fs.writeFileSync("world1.json", JSON.stringify(world1, null, 2));
      fs.writeFileSync("world2.json", JSON.stringify(world2, null, 2));
  }
}
run();
