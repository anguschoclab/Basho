import { describe, it, expect } from "vitest";
import { generateInitialWorld } from "../systems/generation/WorldFactory";
import { simulateEntireBasho } from "../simulation/TournamentSimulator";
import { getNextBasho, getBashoNumber } from "../calendar";
import { publishBanzukeUpdate } from "../banzuke/BanzukePublisher";
import { applyImpact } from "../core/ImpactResolver";
import type { WorldState } from "../types/world";

describe("debug standings", () => {
  it("checks standings are populated", () => {
    const world = generateInitialWorld("no-yokozuna-test-001");
    const rikishiMap = new Map(world.rikishi);
    for (const [id, r] of rikishiMap) {
      if (r.rank === "yokozuna") {
        rikishiMap.set(id, { ...r, isRetired: true });
      }
    }
    let currentWorld = { ...world, rikishi: rikishiMap };
    const bashoName = currentWorld.currentBashoName || "hatsu";
    const bashoSeed = `test-seed-${bashoName}`;
    
    const bashoResult = simulateEntireBasho(currentWorld, bashoName, bashoSeed);
    currentWorld = bashoResult.world;
    
    console.log("standings size:", bashoResult.standings.size);
    let totalWins = 0;
    bashoResult.standings.forEach((stats, id) => {
      totalWins += stats.wins;
    });
    console.log("total wins across all sekitori:", totalWins);
    console.log("yusho winner:", bashoResult.yushoWinner.shikona, "wins:", bashoResult.yushoWinner.wins);
    
    // Check what the ozeki's standings show
    const ozekiList = Array.from(currentWorld.rikishi.values()).filter(r => r.rank === "ozeki");
    for (const oz of ozekiList) {
      const s = bashoResult.standings.get(oz.id);
      console.log(`Ozeki ${oz.shikona}: standings=${JSON.stringify(s)}, currentBashoWins=${oz.currentBashoWins}`);
    }
    
    // Now inject and call publishBanzukeUpdate
    const standingsForPublish = new Map<string, { wins: number; losses: number; absences: number }>();
    bashoResult.standings.forEach((stats, id) => {
      standingsForPublish.set(id, {
        wins: stats.wins,
        losses: stats.losses,
        absences: (stats as any).absences || 0,
      });
    });
    
    const nextBashoName = getNextBasho(bashoName);
    const worldWithStandings: WorldState = {
      ...currentWorld,
      cyclePhase: "post_basho",
      _postBashoDays: 7,
      currentBasho: {
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
    const resultWorld = applyImpact(worldWithStandings, banzukeImpact);
    
    // Check ozeki after publish
    for (const oz of ozekiList) {
      const updatedOz = resultWorld.rikishi.get(oz.id);
      if (updatedOz) {
        const ch = updatedOz.careerHistory;
        console.log(`After publish: ${updatedOz.shikona} careerHistory.length=${ch?.length}`);
        if (ch?.length) {
          console.log("  last entry:", JSON.stringify(ch[ch.length-1]));
        }
      }
    }
    
    expect(true).toBe(true);
  }, 30000);
});
