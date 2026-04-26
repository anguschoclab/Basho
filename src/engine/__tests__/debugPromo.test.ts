import { describe, it } from "vitest";
import { generateInitialWorld } from "../systems/generation/WorldFactory";
import { runAutoSim } from "../simulation/AutoSimService";

describe("debug yokozuna", () => {
  it("traces yokozuna promotion path", () => {
    const world = generateInitialWorld("no-yokozuna-test-001");
    const rikishiMap = new Map(world.rikishi);
    for (const [id, r] of rikishiMap) {
      if (r.rank === "yokozuna") {
        rikishiMap.set(id, { ...r, isRetired: true });
        console.log("Retiring yokozuna:", r.shikona);
      }
    }
    
    const ozekiList = Array.from(rikishiMap.values()).filter(r => r.rank === "ozeki");
    console.log("Ozeki count:", ozekiList.length, ozekiList.map(r => r.shikona).join(", "));
    
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
    console.log("All yokozuna:", allYokozuna.map(r => `${r.shikona}(retired=${r.isRetired})`));
    console.log("Active yokozuna:", activeYokozuna.length);
    console.log("StoppedBy:", result.stoppedBy);
    
    // Check ozeki career history
    const ozeki2 = Array.from(result.finalWorld.rikishi.values()).filter(r => r.rank === "ozeki");
    for (const oz of ozeki2.slice(0, 3)) {
      console.log(`Ozeki ${oz.shikona}: ch.len=${oz.careerHistory?.length}, consec=${oz.consecutiveStrongOzeki}`);
      if (oz.careerHistory?.length) {
        const last = oz.careerHistory[oz.careerHistory.length - 1];
        console.log("  last entry:", JSON.stringify(last));
      }
    }
  }, 60000);
});
