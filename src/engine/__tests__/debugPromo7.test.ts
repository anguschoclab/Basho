import { describe, it } from "vitest";
import { generateInitialWorld } from "../systems/generation/WorldFactory";
import { simulateEntireBasho } from "../simulation/TournamentSimulator";
import { getNextBasho, getBashoNumber } from "../calendar";
import { publishBanzukeUpdate } from "../banzuke/BanzukePublisher";
import { advanceDays, enterPostBasho, enterInterim } from "../tick/tickDaily";
import { applyImpact } from "../core/ImpactResolver";
import type { WorldState } from "../types/world";

describe("debug manual autosim", () => {
  it("simulates 3 basho manually", () => {
    const world = generateInitialWorld("no-yokozuna-test-001");
    const rikishiMap = new Map(world.rikishi);
    for (const [id, r] of rikishiMap) {
      if (r.rank === "yokozuna") {
        rikishiMap.set(id, { ...r, isRetired: true });
      }
    }
    let currentWorld = { ...world, rikishi: rikishiMap };
    
    for (let i = 0; i < 3; i++) {
      const bashoName = currentWorld.currentBashoName || "hatsu";
      const nextBashoName = getNextBasho(bashoName);
      console.log(`\n=== Basho ${i+1}: ${bashoName} ===`);
      console.log("  currentBasho before sim:", currentWorld.currentBasho ? "exists" : "undefined");
      
      const bashoResult = simulateEntireBasho(currentWorld, bashoName, `seed-${i}`);
      currentWorld = bashoResult.world;
      
      // Check wins
      let totalWins = 0;
      bashoResult.standings.forEach(s => { totalWins += s.wins; });
      console.log("  total standings wins:", totalWins);
      console.log("  yushoWinner:", bashoResult.yushoWinner.shikona, "wins:", bashoResult.yushoWinner.wins);
      
      const standingsForPublish = new Map<string, { wins: number; losses: number; absences: number }>();
      bashoResult.standings.forEach((stats, id) => {
        standingsForPublish.set(id, { wins: stats.wins, losses: stats.losses, absences: 0 });
      });
      
      const worldWithStandings: WorldState = {
        ...currentWorld,
        cyclePhase: "post_basho",
        _postBashoDays: 7,
        currentBasho: currentWorld.currentBasho
          ? { ...currentWorld.currentBasho, standings: standingsForPublish }
          : {
              bashoName: bashoName,
              year: currentWorld.year,
              bashoNumber: getBashoNumber(bashoName) as 1 | 2 | 3 | 4 | 5 | 6,
              day: 15,
              matches: [],
              standings: standingsForPublish,
              isActive: false,
            },
        history: [
          ...(currentWorld.history || []),
          {
            bashoName: bashoName as any,
            year: currentWorld.year,
            bashoNumber: getBashoNumber(bashoName),
            yusho: bashoResult.yushoWinner.id,
            junYusho: bashoResult.junYusho ?? [],
            prizes: { yushoAmount: 10_000_000, junYushoAmount: 2_000_000, specialPrizes: 2_000_000 },
          } as any,
        ],
      };
      
      const banzukeImpact = publishBanzukeUpdate(worldWithStandings);
      currentWorld = applyImpact(worldWithStandings, banzukeImpact);
      
      console.log("  currentBasho after applyImpact:", currentWorld.currentBasho ? "exists" : "undefined");
      
      currentWorld = enterPostBasho(currentWorld);
      currentWorld = advanceDays(currentWorld, 7);
      currentWorld = enterInterim(currentWorld);
      currentWorld = advanceDays(currentWorld, 42);
    }
    
    // Check ozeki after 3 basho
    const ozeki = Array.from(currentWorld.rikishi.values()).filter(r => r.rank === "ozeki");
    for (const oz of ozeki) {
      console.log(`\nOzeki ${oz.shikona}:`);
      if (oz.careerHistory?.length) {
        for (const ch of oz.careerHistory) {
          console.log(`  ${ch.bashoName}: wins=${ch.wins} isYusho=${ch.isYusho}`);
        }
      }
    }
  }, 120000);
});
