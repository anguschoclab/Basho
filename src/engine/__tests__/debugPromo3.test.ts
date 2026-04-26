import { describe, it, expect } from "vitest";
import { generateInitialWorld } from "../systems/generation/WorldFactory";
import { simulateEntireBasho } from "../simulation/TournamentSimulator";

describe("debug sim", () => {
  it("checks bout outcomes", () => {
    const world = generateInitialWorld("no-yokozuna-test-001");
    const rikishiMap = new Map(world.rikishi);
    for (const [id, r] of rikishiMap) {
      if (r.rank === "yokozuna") {
        rikishiMap.set(id, { ...r, isRetired: true });
      }
    }
    let currentWorld = { ...world, rikishi: rikishiMap };
    const bashoName = currentWorld.currentBashoName || "hatsu";
    
    const bashoResult = simulateEntireBasho(currentWorld, bashoName, `test-basho-${bashoName}`);
    
    // Count bouts with results
    let totalBouts = 0;
    let boutsWithResults = 0;
    if ((bashoResult as any).world?.currentBasho?.matches) {
      const matches = (bashoResult as any).world.currentBasho.matches;
      totalBouts = matches.length;
      boutsWithResults = matches.filter((m: any) => m.result).length;
    }
    
    // How many matches did the basho have?
    const standings = bashoResult.standings;
    let maxWins = 0;
    standings.forEach((s, id) => { if (s.wins > maxWins) maxWins = s.wins; });
    console.log("Max wins in standings:", maxWins);
    console.log("Standings size:", standings.size);
    console.log("Yusho winner wins:", bashoResult.yushoWinner.wins);
    
    // Check that basho matches actually ran
    // Look at rikishi with non-zero bashoWins
    let nonZeroWins = 0;
    for (const r of bashoResult.world.rikishi.values()) {
      if ((r.currentBashoWins ?? 0) > 0) nonZeroWins++;
    }
    console.log("Rikishi with currentBashoWins > 0:", nonZeroWins);
    
    expect(bashoResult.yushoWinner.wins).toBeGreaterThan(0);
  }, 30000);
});
