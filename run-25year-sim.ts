import { generateInitialWorld } from "./src/engine/systems/generation/WorldFactory";
import { runAutoSim } from "./src/engine/simulation/AutoSimService";
import { writeFileSync } from "fs";
import { join } from "path";

async function run25YearSim() {
  console.log("=== Starting 25-Year Headless Simulation ===");
  const seed = "long-term-stability-test-" + Date.now();
  const initialWorld = generateInitialWorld(seed);

  console.log("World generated. Starting simulation loop...");
  console.time("simulation-duration");

  const result = runAutoSim(initialWorld, {
    duration: { type: "years", count: 25 },
    stopConditions: ["stableInsolvency"], // Stop if player stable goes bankrupt (shouldn't happen in headless but good safety)
    verbosity: "standard",
    delegationPolicy: "aggressive",
    observerMode: true,
  });

  console.timeEnd("simulation-duration");
  console.log("Simulation complete!");
  console.log(`Simulated Years: ${result.endYear - result.startYear}`);
  console.log(`Basho Simulated: ${result.bashoSimulated}`);
  console.log(`Final Year: ${result.endYear}`);
  console.log(`Stopped By: ${result.stoppedBy}`);

  // Save detailed metrics to a file
  const outputPath = join(process.cwd(), "simulation-results.json");
  const report = {
    seed,
    chronicle: result.chronicle,
    tuningMetrics: result.tuningMetrics,
  };

  writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(`Detailed report saved to: ${outputPath}`);

  // Print Tuning Summary
  const metrics = result.tuningMetrics;
  if (metrics) {
    console.log("\n--- Tuning Summary ---");
    console.log("Stat Averages (Active Rikishi):");
    console.log(`  Power:     ${metrics.statAverages.power.toFixed(2)}`);
    console.log(`  Speed:     ${metrics.statAverages.speed.toFixed(2)}`);
    console.log(`  Technique: ${metrics.statAverages.technique.toFixed(2)}`);
    console.log(`  Stamina:   ${metrics.statAverages.stamina.toFixed(2)}`);
    
    console.log("\nRetirement Stats:");
    console.log(`  Avg Retirement Age: ${metrics.averageRetirementAge.toFixed(1)}`);
    
    console.log("\nEconomic Health:");
    console.log(`  Avg Stable Funds: ${metrics.stableWealth.mean.toLocaleString()} kesho`);
    console.log(`  Bankrupt Stables: ${metrics.stableWealth.bankruptCount}`);
    
    console.log("\nRank Distribution:");
    Object.entries(metrics.rankDistribution).forEach(([rank, count]) => {
      console.log(`  ${rank.padEnd(12)}: ${count}`);
    });
  }
}

run25YearSim().catch(console.error);
