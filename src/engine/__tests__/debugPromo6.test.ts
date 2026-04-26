import { describe, it } from "vitest";
import { generateInitialWorld } from "../systems/generation/WorldFactory";
import { runAutoSim } from "../simulation/AutoSimService";

describe("debug yokozuna v2", () => {
  it("traces promotion path with real wins", () => {
    const world = generateInitialWorld("no-yokozuna-test-001");
    const rikishiMap = new Map(world.rikishi);
    let retiredCount = 0;
    for (const [id, r] of rikishiMap) {
      if (r.rank === "yokozuna") {
        rikishiMap.set(id, { ...r, isRetired: true });
        retiredCount++;
        console.log("Retiring yokozuna:", r.shikona);
      }
    }
    console.log("Retired", retiredCount, "yokozuna");
    
    const ozekiList = Array.from(rikishiMap.values()).filter(r => r.rank === "ozeki");
    console.log("Initial ozeki:", ozekiList.map(r => r.shikona));
    
    const worldNoYokozuna = { ...world, rikishi: rikishiMap };
    const result = runAutoSim(worldNoYokozuna, {
      duration: { type: "basho", count: 12 },
      stopConditions: ["yokozunaPromotion"],
      verbosity: "minimal",
      delegationPolicy: "balanced",
      observerMode: true,
    });

    const allYokozuna = Array.from(result.finalWorld.rikishi.values())
      .filter(r => r.rank === "yokozuna");
    const activeYokozuna = allYokozuna.filter(r => !r.isRetired);
    console.log("StoppedBy:", result.stoppedBy);
    console.log("Active yokozuna:", activeYokozuna.map(r => r.shikona));
    console.log("All ranks of top rikishi (sorted by wins):");
    
    const topRikishi = Array.from(result.finalWorld.rikishi.values())
      .filter(r => r.division === "makuuchi" && !r.isRetired)
      .sort((a, b) => (b.careerWins || 0) - (a.careerWins || 0))
      .slice(0, 5);
    for (const r of topRikishi) {
      console.log(`  ${r.shikona} rank=${r.rank} careerWins=${r.careerWins} ch.len=${r.careerHistory?.length}`);
      if (r.careerHistory?.length) {
        const recent = r.careerHistory.slice(-3);
        for (const ch of recent) {
          console.log(`    basho=${ch.bashoName} wins=${ch.wins} isYusho=${ch.isYusho}`);
        }
      }
    }
  }, 120000);
});
