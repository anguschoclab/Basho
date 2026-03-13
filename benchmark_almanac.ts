import { buildAlmanacSnapshot } from "./src/engine/almanac";
import type { WorldState, BashoState, Rikishi, Match } from "./src/engine/types";
import { performance } from "perf_hooks";

// Mock world state for testing
const generateMockWorld = (numRikishi: number, numMatches: number): WorldState => {
  const makuuchiRikishi = Array.from({ length: numRikishi }).map((_, i) => ({
    id: `r${i}`,
    shikona: `Rikishi ${i}`,
    division: "makuuchi" as const,
    currentBashoWins: Math.floor(Math.random() * 15),
    injured: Math.random() > 0.8,
  })) as Rikishi[];

  const matches = Array.from({ length: numMatches }).map((_, i) => ({
    result: Math.random() > 0.5 ? "win" : "loss"
  })) as Match[];

  return {
    year: 2024,
    currentBasho: {
      year: 2024,
      bashoNumber: 1,
      bashoName: "hatsu",
      matches,
    } as BashoState,
    rikishi: new Map(makuuchiRikishi.map(r => [r.id, r])),
  } as unknown as WorldState;
};

const runBenchmark = (world: WorldState, iterations = 1000) => {
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    buildAlmanacSnapshot(world);
  }
  const end = performance.now();
  return end - start;
};

const world = generateMockWorld(1000, 10000); // Scale up to make difference measurable

// Warm up
runBenchmark(world, 100);

const ms = runBenchmark(world, 1000);
console.log(`Baseline time for 1000 iterations: ${ms.toFixed(2)} ms`);
