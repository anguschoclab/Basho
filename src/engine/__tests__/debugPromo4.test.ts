import { describe, it, expect } from "vitest";
import { generateInitialWorld } from "../systems/generation/WorldFactory";
import { simulateEntireBasho } from "../simulation/TournamentSimulator";

describe("debug sim v2", () => {
  it("checks if schedule is generated", () => {
    const world = generateInitialWorld("career-history-test-001");
    const bashoName = world.currentBashoName || "hatsu";
    const bashoResult = simulateEntireBasho(world, bashoName, `debug-seed`);
    
    console.log("Standings size:", bashoResult.standings.size);
    console.log("Yusho winner wins:", bashoResult.yushoWinner.wins);
    
    let totalWins = 0;
    bashoResult.standings.forEach((s, _) => { totalWins += s.wins; });
    console.log("Total wins:", totalWins);
    
    expect(bashoResult.yushoWinner.wins).toBeGreaterThan(0);
  }, 30000);
});
