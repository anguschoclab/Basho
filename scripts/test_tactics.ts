import { resolveBout } from "../src/engine/bout";
import type { Rikishi } from "../src/engine/types/rikishi";
import type { BashoState } from "../src/engine/types/basho";
import type { BoutTactic, TacticalArchetype } from "../src/engine/types/combat";

function createMockRikishi(id: string): Rikishi {
  return {
    id,
    shikona: `Rikishi-${id}`,
    heyaId: `heya-1`,
    rank: "maegashira",
    rankNumber: 5,
    division: "makuuchi",
    side: "east",
    weight: 150,
    height: 185,
    style: "hybrid",
    archetype: "all_rounder" as TacticalArchetype,
    power: 50,
    speed: 50,
    balance: 50,
    technique: 50,
    aggression: 50,
    experience: 50,
    adaptability: 50,
    stamina: 50,
    momentum: 50,
    fatigue: 0,
    stats: { strength: 50, technique: 50, speed: 50, stamina: 50, mental: 50, adaptability: 50, balance: 50, weight: 150 },
    potential: { strength: 50, technique: 50, speed: 50, stamina: 50, mental: 50, adaptability: 50, balance: 50, weight: 150 },
    age: 25,
    injurySusceptibility: 5,
    morale: 50,
    wins: 0,
    losses: 0,
    careerWins: 0,
    careerLosses: 0,
    careerYusho: 0,
    history: [],
    h2h: {},
    isPlayer: false,
  };
}

const p1 = createMockRikishi("p1");
const p2 = createMockRikishi("p2");
const basho = { id: "test", year: 2025, bashoName: "hatsu", day: 1, matches: [], standings: new Map(), isActive: true } as unknown as BashoState;

const tactics: BoutTactic[] = ["STANDARD", "YOTSU_BELT", "OSHI_THRUST", "HENKA"];

console.log("=== Tactical RPS Balance Test (10,000 Bouts per Matchup) ===");

for (const t1 of tactics) {
  for (const t2 of tactics) {
    let p1Wins = 0;
    const total = 10000;

    for (let i = 0; i < total; i++) {
      const ctx = {
        id: `bout-${t1}-${t2}-${i}`,
        day: 1,
        rikishiEastId: p1.id,
        rikishiWestId: p2.id,
        playerSide: "east" as const,
        playerTactic: t1,
        // We will mock the west tactic by temporarly making west a player too or by directly modifying the function call
        // Actually, our engine logic says if playerSide === "east", CPU tactic is determined randomly.
        // We need to pass the specific tactic to the CPU to test all combinations.
        // Let's monkey-patch determineCPUTactic just for this test, or use the UI logic where we pass tactics to both.
        // Wait, resolveBout only takes playerTactic from boutContext. If we want to force both tactics, we can add `cpuTacticOverride` to BoutContext for testing, OR we just modify `p1` and `p2` to be `isPlayer = true` and change the engine to accept both?
        // Let's just mock determineCPUTactic in h2h.ts via bun test mock, or since this is a script, we can just edit h2h.ts temporarily.
      };

      // We can temporarily add a global override
      globalThis.TEST_CPU_TACTIC = t2;

      const res = resolveBout(ctx, p1, p2, basho);
      if (res.winner === "east") p1Wins++;
    }

    const winRate = (p1Wins / total) * 100;
    console.log(`P1: ${t1.padEnd(12)} vs P2: ${t2.padEnd(12)} -> P1 Win Rate: ${winRate.toFixed(2)}%`);
  }
}
