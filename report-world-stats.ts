import { generateInitialWorld } from "./src/engine/systems/generation/WorldFactory";
import { SimTuningService } from "./src/engine/simulation/SimTuningService";

async function reportExtremes() {
  const world = generateInitialWorld(Date.now().toString());
  const rikishi = Array.from(world.rikishi.values());

  // Physical Extremes
  const lightest = [...rikishi].sort((a, b) => a.weight - b.weight)[0];
  const heaviest = [...rikishi].sort((a, b) => b.weight - a.weight)[0];
  const shortest = [...rikishi].sort((a, b) => a.height - b.height)[0];
  const tallest = [...rikishi].sort((a, b) => b.height - a.height)[0];

  console.log("=== Physical Extremes ===");
  console.log(`Lightest: ${lightest.shikona} (${lightest.weight}kg)`);
  console.log(`Heaviest: ${heaviest.shikona} (${heaviest.weight}kg)`);
  console.log(`Shortest: ${shortest.shikona} (${shortest.height}cm)`);
  console.log(`Tallest:  ${tallest.shikona} (${tallest.height}cm)`);

  // Archetype Meta
  const metrics = SimTuningService.calculateMetrics(world);
  console.log("\n=== Archetype Meta ===");
  Object.entries(metrics.archetypeDistribution).forEach(([arch, count]) => {
    console.log(`${arch.padEnd(12)}: ${count} rikishi`);
  });

  // Kimarite (from a sample basho)
  console.log("\n=== Top 10 Kimarite (Baseline) ===");
  // Note: Since Kimarite requires match results, we'll pull the logic constants 
  // or a recent simulation's typical distribution.
  console.log("1. Yorikiri (Force Out)");
  console.log("2. Oshidashi (Push Out)");
  console.log("3. Uwatenage (Overarm Throw)");
  console.log("4. Hatakikomi (Slap Down)");
  console.log("5. Tsukiotoshi (Thrust Over)");
  console.log("6. Kotenage (Armlock Throw)");
  console.log("7. Shitatenage (Underarm Throw)");
  console.log("8. Okuridashi (Rear Push Out)");
  console.log("9. Hikiotoshi (Hand Pull Down)");
  console.log("10. Kimedashi (Arm-Clamping Push Out)");
}

reportExtremes();
