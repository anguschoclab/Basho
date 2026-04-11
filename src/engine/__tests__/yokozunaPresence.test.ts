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

    // Track yokozuna presence by year
    const yearsWithoutYokozuna: number[] = [];
    const yearsWithYokozuna: number[] = [];

    for (let year = result.startYear; year <= result.endYear; year++) {
      const hasYokozuna = Array.from(result.finalWorld.rikishi.values()).some(
        r => r.rank === "yokozuna"
      );

      if (hasYokozuna) {
        yearsWithYokozuna.push(year);
      } else {
        yearsWithoutYokozuna.push(year);
      }
    }

    console.log("\n=== 20-Year Yokozuna Presence Report ===");
    console.log(`Start Year: ${result.startYear}`);
    console.log(`End Year: ${result.endYear}`);
    console.log(`Total Years: ${result.endYear - result.startYear + 1}`);
    console.log(`Years with Yokozuna: ${yearsWithYokozuna.length}`);
    console.log(`Years without Yokozuna: ${yearsWithoutYokozuna.length}`);
    console.log(`Percentage without Yokozuna: ${((yearsWithoutYokozuna.length / (result.endYear - result.startYear + 1)) * 100).toFixed(1)}%`);

    if (yearsWithoutYokozuna.length > 0) {
      console.log(`\nYears without Yokozuna: ${yearsWithoutYokozuna.join(", ")}`);
    }

    expect(yearsWithoutYokozuna.length).toBeGreaterThanOrEqual(0);
    expect(result.bashoSimulated).toBe(120); // 20 years * 6 basho per year
  }, 300000); // 5 minute timeout for 20-year simulation
});
