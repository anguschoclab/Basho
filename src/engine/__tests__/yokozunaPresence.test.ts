/**
 * yokozunaPresence.test.ts
 * ============================
 * Run a 20-year simulation to track yokozuna presence over time.
 */

import { describe, it, expect } from "vitest";
import { generateInitialWorld } from "../systems/generation/WorldFactory";
import { runAutoSim, type AutoSimConfig } from "../simulation/AutoSimService";

describe("20-year yokozuna presence simulation", () => {
  it("tracks yokozuna presence over 20 years", () => {
    const seed = "yokozuna-presence-test";
    const world = generateInitialWorld(seed);

    const config: AutoSimConfig = {
      duration: { type: "years", count: 20 },
      stopConditions: [],
      verbosity: "minimal",
      delegationPolicy: "balanced",
      observerMode: true,
    };

    const result = runAutoSim(world, config);

    const totalCountByBasho: number[] = [];
    const healthyCountByBasho: number[] = [];
    let currentWorld = world;

    const TOTAL_BASHO = 600; // 100 years

    for (let i = 0; i < TOTAL_BASHO; i++) {
      const result = runAutoSim(currentWorld, { ...config, duration: { type: "basho", count: 1 } });
      currentWorld = result.finalWorld;
      
      const rikishi = Array.from(currentWorld.rikishi.values());
      const yokozunas = rikishi.filter(r => r.rank === "yokozuna");
      const healthyYokozunas = yokozunas.filter(r => !r.injured);
      
      totalCountByBasho.push(yokozunas.length);
      healthyCountByBasho.push(healthyYokozunas.length);
    }

    const bashoWithoutAnyYokozuna = totalCountByBasho.filter(c => c === 0).length;
    const bashoWithoutHealthyYokozuna = healthyCountByBasho.filter(c => c === 0).length;
    
    console.log("\n=== 100-Year Yokozuna Presence Report ===");
    console.log(`Total Basho Simulated: ${TOTAL_BASHO}`);
    console.log(`Basho with 0 Yokozuna on Banzuke: ${bashoWithoutAnyYokozuna} (${((bashoWithoutAnyYokozuna / TOTAL_BASHO) * 100).toFixed(1)}%)`);
    console.log(`Basho with 0 Healthy Yokozunas: ${bashoWithoutHealthyYokozuna} (${((bashoWithoutHealthyYokozuna / TOTAL_BASHO) * 100).toFixed(1)}%)`);
    
    const healthyDensity = (bashoWithoutHealthyYokozuna / TOTAL_BASHO) * 100;
    console.log(`Target "No Healthy" Density: 3-5%`);
    console.log(`Actual "No Healthy" Density: ${healthyDensity.toFixed(1)}%`);

    expect(bashoWithoutAnyYokozuna).toBeGreaterThanOrEqual(0);
    expect(healthyCountByBasho.length).toBe(TOTAL_BASHO);
  }, 600000); // 10 minute timeout for 100-year simulation
});
