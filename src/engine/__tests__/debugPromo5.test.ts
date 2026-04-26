import { describe, it, expect } from "vitest";
import { generateInitialWorld } from "../systems/generation/WorldFactory";
import { simulateEntireBasho } from "../simulation/TournamentSimulator";
import { initializeBasho } from "../systems/generation/WorldFactory";

describe("debug sim v3", () => {
  it("checks basho matches after init", () => {
    const world = generateInitialWorld("career-history-test-001");
    const bashoName = world.currentBashoName || "hatsu";
    console.log("bashoName:", bashoName);
    
    // First check if basho initialization creates matches
    const basho = initializeBasho(world, bashoName);
    console.log("basho.matches count:", basho.matches.length);
    
    // Check a few matches
    if (basho.matches.length > 0) {
      const first = basho.matches[0];
      console.log("First match:", JSON.stringify(first));
    }
    
    // Now simulate
    const bashoResult = simulateEntireBasho(world, bashoName, "debug-seed");
    
    console.log("yushoWinner:", bashoResult.yushoWinner.shikona, "wins:", bashoResult.yushoWinner.wins);
    console.log("keyBouts.length:", bashoResult.keyBouts.length);
    
    // Check if the RETURNED world has updated rikishi
    let nonZeroWins = 0;
    bashoResult.world.rikishi.forEach((r) => {
      if ((r.currentBashoWins ?? 0) > 0) nonZeroWins++;
    });
    console.log("Rikishi with nonzero wins in returned world:", nonZeroWins);
    
    expect(basho.matches.length).toBeGreaterThan(0);
  }, 30000);
});
