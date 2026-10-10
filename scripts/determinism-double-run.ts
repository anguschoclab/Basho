/**
 * determinism-double-run.ts
 * =========================
 * WS8 gate: run identical seeds through the autosim twice and require
 * byte-identical canonical serialization of the final world.
 *
 * Run: bun scripts/determinism-double-run.ts [basho|year]
 */

import { generateInitialWorld } from "../src/engine/systems/generation/WorldFactory";
import { runAutoSim } from "../src/engine/simulation/AutoSimService";
import { SerializationService } from "../src/engine/persistence/SerializationService";

const horizon = process.argv[2] === "year" ? "year" : "basho";
const SEED = `determinism-double-run-${horizon}`;
const RUNS = 2;

const { BardEngine } = await import("../src/engine/bard/BardEngine");
await BardEngine.loadDomains();

function runOnce(): string {
  let world = generateInitialWorld(SEED);
  world = { ...world, playerHeyaId: undefined };
  const result = runAutoSim(world, {
    duration: horizon === "year" ? { type: "years", count: 1 } : { type: "basho", count: 2 },
    stopConditions: [],
    verbosity: "minimal",
    delegationPolicy: "balanced",
    observerMode: true,
  });
  const serialized = SerializationService.serializeWorld(result.finalWorld);
  return JSON.stringify(serialized);
}

const outputs: string[] = [];
for (let i = 0; i < RUNS; i++) {
  const t0 = Date.now();
  outputs.push(runOnce());
  console.log(
    `run ${i + 1}: ${outputs[i].length} bytes in ${((Date.now() - t0) / 1000).toFixed(1)}s`
  );
}

const identical = outputs.every((o) => o === outputs[0]);
if (!identical) {
  // Locate first divergence for debugging
  const a = outputs[0];
  const b = outputs[1];
  let idx = 0;
  while (idx < Math.min(a.length, b.length) && a[idx] === b[idx]) idx++;
  console.error(`\nDIVERGENCE at byte ${idx}:`);
  console.error(`  run1: ...${a.slice(Math.max(0, idx - 80), idx + 80)}...`);
  console.error(`  run2: ...${b.slice(Math.max(0, idx - 80), idx + 80)}...`);
  process.exit(1);
}
console.log(
  `\nPASS — ${RUNS} runs byte-identical (${outputs[0].length} bytes, horizon=${horizon})`
);
