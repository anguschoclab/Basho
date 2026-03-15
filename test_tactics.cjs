const { resolveBout } = require("./src/engine/bout.ts");

const p1 = {
  id: "p1", shikona: "P1", heyaId: "h1", rank: "maegashira", rankNumber: 5,
  division: "makuuchi", side: "east", weight: 150, height: 185, style: "hybrid", archetype: "all_rounder",
  power: 50, speed: 50, balance: 50, technique: 50, aggression: 50, experience: 50, adaptability: 50, stamina: 50, momentum: 50, fatigue: 0,
  stats: { strength: 50, technique: 50, speed: 50, stamina: 50, mental: 50, adaptability: 50, balance: 50, weight: 150 },
  isPlayer: false
};
const p2 = {
  id: "p2", shikona: "P2", heyaId: "h2", rank: "maegashira", rankNumber: 5,
  division: "makuuchi", side: "west", weight: 150, height: 185, style: "hybrid", archetype: "all_rounder",
  power: 50, speed: 50, balance: 50, technique: 50, aggression: 50, experience: 50, adaptability: 50, stamina: 50, momentum: 50, fatigue: 0,
  stats: { strength: 50, technique: 50, speed: 50, stamina: 50, mental: 50, adaptability: 50, balance: 50, weight: 150 },
  isPlayer: false
};
const basho = { id: "test", year: 2025, bashoName: "hatsu", day: 1, matches: [], standings: new Map(), isActive: true };

const tactics = ["STANDARD", "YOTSU_BELT", "OSHI_THRUST", "HENKA"];

console.log("=== Tactical RPS Balance Test (10,000 Bouts per Matchup) ===");

for (const t1 of tactics) {
  for (const t2 of tactics) {
    let p1Wins = 0;
    const total = 10000;
    
    for (let i = 0; i < total; i++) {
      basho.day = i; // force new seed
      const ctx = {
        id: `bout-${t1}-${t2}-${i}`,
        day: i,
        rikishiEastId: p1.id,
        rikishiWestId: p2.id,
        playerSide: "east",
        playerTactic: t1,
        cpuTacticOverride: t2
      };
      
      const res = resolveBout(ctx, p1, p2, basho);
      if (res.winner === "east") p1Wins++;
    }
    
    const winRate = (p1Wins / total) * 100;
    console.log(`P1: ${t1.padEnd(12)} vs P2: ${t2.padEnd(12)} -> P1 Win Rate: ${winRate.toFixed(2)}%`);
  }
}
