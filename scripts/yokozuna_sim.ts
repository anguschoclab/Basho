import { generateInitialWorld } from "../src/engine/systems/generation/WorldFactory";
import { runAutoSim, type AutoSimConfig } from "../src/engine/simulation/AutoSimService";

async function runSim() {
  const seed = "baseline-sim-" + Date.now();
  const world = generateInitialWorld(seed);

  console.log("Starting 50-year baseline simulation...");

  const yokozunaHistory: { year: number; basho: string; count: number }[] = [];

  // We need to intercept the world state after each basho.
  // AutoSimService.ts simulates in a loop.
  // I'll create a modified version or just run 1 basho at a time.

  let currentWorld = world;
  const totalBasho = 50 * 6;

  for (let i = 0; i < totalBasho; i++) {
    const config: AutoSimConfig = {
      duration: { type: "basho", count: 1 },
      stopConditions: [],
      verbosity: "minimal",
      delegationPolicy: "balanced",
      observerMode: true,
    };

    const result = runAutoSim(currentWorld, config);
    currentWorld = result.finalWorld;

    const yokozunaCount = Array.from(currentWorld.rikishi.values()).filter(
      (r) => r.rank === "yokozuna"
    ).length;

    yokozunaHistory.push({
      year: currentWorld.year,
      basho: currentWorld.currentBashoName || "hatsu",
      count: yokozunaCount,
    });

    if (i % 30 === 0) {
      console.log(`Simulated year ${currentWorld.year}...`);
    }
  }

  // A year is considered "without" if no basho in that year had a Yokozuna? 
  // Or more accurately: Basho-by-basho percentage.
  
  const zeroYokozunaBasho = yokozunaHistory.filter(h => h.count === 0).length;
  
  console.log("\n=== Baseline Simulation Results (50 Years) ===");
  console.log(`Total Basho: ${totalBasho}`);
  console.log(`Basho with 0 Yokozuna: ${zeroYokozunaBasho} (${((zeroYokozunaBasho / totalBasho) * 100).toFixed(1)}%)`);
  
  const counts = new Map<number, number>();
  yokozunaHistory.forEach(h => {
    counts.set(h.count, (counts.get(h.count) || 0) + 1);
  });

  console.log("Distribution of Yokozuna counts per basho:");
  for (const [count, freq] of Array.from(counts.entries()).sort((a, b) => a[0] - b[0])) {
    console.log(`  ${count} Yokozuna: ${freq} basho (${((freq / totalBasho) * 100).toFixed(1)}%)`);
  }
}

runSim().catch(console.error);
