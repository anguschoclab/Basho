import { generateInitialWorld } from "./src/engine/systems/generation/WorldFactory";
import { runAutoSim } from "./src/engine/simulation/AutoSimService";
import { writeFileSync } from "fs";
import { join } from "path";

async function run25YearSim() {
  console.log("=== Starting 25-Year Headless Simulation ===");
  const seed = "long-term-stability-test-" + Date.now();
  // 1. Initial World Generation
  let currentWorld = generateInitialWorld(seed);

  // 1.5. ROSTER INTEGRITY CLEAN-UP (Hardening)
  // Ensure heya.rikishiIds matches reality before starting the 25-year march
  const nextHeyas = new Map(currentWorld.heyas);
  for (const [heyaId, heya] of nextHeyas) {
    const actualRikishiIds = Array.from(currentWorld.rikishi.values())
      .filter(r => r.heyaId === heyaId && !r.isRetired)
      .map(r => r.id);
    nextHeyas.set(heyaId, { ...heya, rikishiIds: actualRikishiIds });
  }
  currentWorld = { ...currentWorld, heyas: nextHeyas };

  console.log("World generated and rosters synchronized. Starting simulation loop...");
  console.time("simulation-duration");

  const result = runAutoSim(currentWorld, {
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

    console.log("\nArchetype Distribution (Drift Check):");
    Object.entries(metrics.archetypeDistribution).forEach(([arch, count]) => {
      console.log(`  ${arch.padEnd(12)}: ${count}`);
    });

    console.log("\nTop 10 Kimarite (Combat Variety):");
    metrics.topKimarite.forEach((k, i) => {
      console.log(`  ${(i + 1).toString().padStart(2)}. ${k.id.padEnd(15)}: ${k.count}`);
    });

    console.log("\nOyakata Ecosystem:");
    console.log(`  Total Oyakata:          ${metrics.oyakataMetrics.totalOyakata}`);
    console.log(`  Retired Rikishi -> Oya: ${metrics.oyakataMetrics.newOyakataFromRikishi}`);
    console.log(`  Oyakata Promotion Rate: ${metrics.oyakataMetrics.promotionRate.toFixed(1)}%`);
    console.log(`  Myoseki Saturation:     ${metrics.oyakataMetrics.myosekiSaturation.toFixed(1)}%`);

    console.log("\nHistorical Prestige & Parity:");
    console.log(`  Bashos without Yokozuna: ${metrics.yokozunaVacantBashoCount}`);
    console.log(`  Unique Basho Winners:    ${metrics.uniqueWinnerCount}`);

    console.log("\nBeya Dominance (Top 5 Stables):");
    metrics.beyaDominance.forEach((b, i) => {
      console.log(`  ${(i + 1).toString().padStart(2)}. ${b.name.padEnd(20)}: ${b.yusho} Yusho`);
    });

    console.log("\nEntropy & Drift Audit:");
    console.log(`  Max World Stat:         ${metrics.entropyAudit.maxStat.toFixed(1)}`);
    console.log(`  Average Rikishi Age:    ${metrics.entropyAudit.avgAge.toFixed(1)}`);
    console.log(`  Active Injury Rate:     ${metrics.entropyAudit.injuryRate.toFixed(1)}%`);
  }
}

run25YearSim().catch(console.error);
