import { generateInitialWorld } from "./src/engine/systems/generation/WorldFactory";
import { runAutoSim } from "./src/engine/simulation/AutoSimService";

async function debugImmortality() {
  const world = generateInitialWorld("immortality-debug-" + Date.now());
  
  const result = runAutoSim(world, {
    duration: { type: "years", count: 25 },
    stopConditions: [],
    observerMode: true,
  });

  const finalWorld = result.finalWorld;
  if (!finalWorld) {
    console.error("No final world state captured.");
    return;
  }

  const activeRikishi = Array.from(finalWorld.rikishi.values()).filter(r => !r.isRetired);
  console.log(`\n=== Final Active Population: ${activeRikishi.length} ===`);
  
  const sortedByWins = [...activeRikishi].sort((a, b) => (b.makuuchiWins || 0) - (a.makuuchiWins || 0));
  console.log("\n--- Top Active Rikishi by Wins ---");
  sortedByWins.slice(0, 10).forEach(r => {
    console.log(`${r.shikona.padEnd(15)} | Age: ${r.age} | Wins: ${r.makuuchiWins} | Yusho: ${r.yushoCount || 0}`);
  });

  const sortedByAge = [...activeRikishi].sort((a, b) => b.age - a.age);
  console.log("\n--- Oldest Active Rikishi ---");
  sortedByAge.slice(0, 10).forEach(r => {
    console.log(`${r.shikona.padEnd(15)} | Age: ${r.age} | Rank: ${r.division} ${r.rank}`);
  });
}

debugImmortality();
