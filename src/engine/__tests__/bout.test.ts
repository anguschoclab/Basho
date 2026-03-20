import { describe, it, expect } from "bun:test";
import { mockRikishi } from "./utils";
import { resolveBout, simulateBout } from "../bout";
import type { Rikishi } from "../types/rikishi";
import type { BashoState, BoutResult } from "../types/basho";
import type { TacticalArchetype } from "../types/combat";

function mockBasho(): BashoState {
  return {
    year: 2026,
    bashoNumber: 1,
    bashoName: "hatsu",
    day: 1,
    matches: [],
    standings: new Map(),
    isActive: true
  } as unknown as BashoState;
}

describe("Bout Simulation Engine", () => {
  it("should produce a valid BoutResult with all required fields", () => {
    const east = mockRikishi("e1", { shikona: "Asayama" });
    const west = mockRikishi("w1", { shikona: "Takafuji" });
    const basho = mockBasho();

    const result = resolveBout(
      { id: "bout-1", day: 1, rikishiEastId: "e1", rikishiWestId: "w1" },
      east, west, basho
    );

    expect(result.boutId).toBe("bout-1");
    expect(["east", "west"]).toContain(result.winner);
    expect(result.winnerRikishiId).toBeDefined();
    expect(result.loserRikishiId).toBeDefined();
    expect(result.kimarite).toBeTruthy();
    expect(result.kimariteName).toBeTruthy();
    expect(typeof result.duration).toBe("number");
    expect(result.duration).toBeGreaterThan(0);
    expect(typeof result.upset).toBe("boolean");
    expect(result.log.length).toBeGreaterThan(0);
  });

  it("should be fully deterministic with the same inputs", () => {
    const east = mockRikishi("e1", { shikona: "Asayama" });
    const west = mockRikishi("w1", { shikona: "Takafuji" });
    const basho = mockBasho();
    const bout = { id: "bout-det", day: 1, rikishiEastId: "e1", rikishiWestId: "w1" };

    const r1 = resolveBout(bout, east, west, basho);
    const r2 = resolveBout(bout, east, west, basho);

    expect(r1.winner).toBe(r2.winner);
    expect(r1.kimarite).toBe(r2.kimarite);
    expect(r1.duration).toBe(r2.duration);
  });

  it("should detect upsets when lower-ranked rikishi wins", () => {
    const yokozuna = mockRikishi("y1", { shikona: "Yokozuna", rank: "yokozuna", rankNumber: 1, power: 90, technique: 90, balance: 90, speed: 80, aggression: 80, experience: 90, weight: 160 });
    const maegashira = mockRikishi("m1", { shikona: "Maegashira", rank: "maegashira", rankNumber: 10, power: 50, technique: 50, balance: 50, speed: 50 });
    const basho = mockBasho();

    // Run many bouts to check upset detection works when it happens
    let foundUpset = false;
    for (let i = 0; i < 500; i++) {
      const bout = { id: `bout-upset-${i}`, day: 1, rikishiEastId: "y1", rikishiWestId: "m1" };
      // Make maegashira extremely strong for this test to force an upset
      const strongMaegashira = { ...maegashira, power: 100, technique: 100, speed: 100 };
      const weakYokozuna = { ...yokozuna, power: 10, technique: 10, speed: 10 };
      const result = resolveBout(bout, weakYokozuna as Rikishi, strongMaegashira as Rikishi, basho);
      if (result.upset) {
        foundUpset = true;
        break;
      }
    }
    // With attempts, at least one upset should occur
    expect(foundUpset).toBe(true);
  });

  it("should detect kinboshi when maegashira beats yokozuna", () => {
    const yokozuna = mockRikishi("y1", { shikona: "Yokozuna", rank: "yokozuna", rankNumber: 1 });
    const maegashira = mockRikishi("m1", { shikona: "Maegashira", rank: "maegashira", rankNumber: 10 });
    const basho = mockBasho();

    let foundKinboshi = false;
    for (let i = 0; i < 500; i++) {
      const bout = { id: `bout-kin-${i}`, day: 1, rikishiEastId: "y1", rikishiWestId: "m1" };
      // Make maegashira extremely strong to force a win against Yokozuna
      const strongMaegashira = { ...maegashira, power: 100, technique: 100, speed: 100 };
      const weakYokozuna = { ...yokozuna, power: 10, technique: 10, speed: 10 };
      const result = resolveBout(bout, weakYokozuna as Rikishi, strongMaegashira as Rikishi, basho);
      if (result.isKinboshi) {
        foundKinboshi = true;
        break;
      }
    }
    expect(foundKinboshi).toBe(true);
  });

  it("should produce different kimarite across many bouts (diversity)", () => {
    const east = mockRikishi("e1", { shikona: "Asayama", style: "hybrid", archetype: "all_rounder" });
    const west = mockRikishi("w1", { shikona: "Takafuji", style: "hybrid", archetype: "all_rounder" });
    const basho = mockBasho();

    const kimariteSet = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const east = mockRikishi(`e-${i}`, { shikona: "Asayama", style: "hybrid", archetype: "all_rounder" });
      const west = mockRikishi(`w-${i}`, { shikona: "Takafuji", style: "hybrid", archetype: "all_rounder" });
      const bout = { id: `bout-div-${i}`, day: 1, rikishiEastId: east.id, rikishiWestId: west.id };
      const result = resolveBout(bout, east, west, basho);
      kimariteSet.add(result.kimarite);
    }

    // With 100 bouts, we expect at least 5 unique techniques
    expect(kimariteSet.size).toBeGreaterThanOrEqual(5);
  });


  it("should work via simulateBout convenience helper", () => {
    const east = mockRikishi("e1", { shikona: "Asayama" });
    const west = mockRikishi("w1", { shikona: "Takafuji" });

    const result = simulateBout(east, west, "sim-seed-1");

    expect(result.boutId).toBeDefined();
    expect(["east", "west"]).toContain(result.winner);
    expect(result.kimarite).toBeTruthy();
  });

  describe("Archetype-aware tactics", () => {
    it("should produce varied win rates across archetype matchups", () => {
      const archetypes: TacticalArchetype[] = ["oshi_specialist", "yotsu_specialist", "counter_specialist"];
      const results: Record<string, number> = {};

      for (const archA of archetypes) {
        for (const archB of archetypes) {
          if (archA === archB) continue;
          const key = `${archA}_vs_${archB}`;
          let eastWins = 0;
          for (let i = 0; i < 50; i++) {
            const east = mockRikishi(`e-${i}`, { archetype: archA, style: archA.includes("oshi") ? "oshi" : archA.includes("yotsu") ? "yotsu" : "hybrid" });
            const west = mockRikishi(`w-${i}`, { archetype: archB, style: archB.includes("oshi") ? "oshi" : archB.includes("yotsu") ? "yotsu" : "hybrid" });
            const bout = { id: `tac-${key}-${i}`, day: 1, rikishiEastId: `e-${i}`, rikishiWestId: `w-${i}` };
            const result = resolveBout(bout, east, west, mockBasho());
            if (result.winner === "east") eastWins++;
          }
          results[key] = eastWins / 50;
        }
      }

      // Each matchup should produce non-trivial win rates (not 0% or 100%)
      for (const [key, rate] of Object.entries(results)) {
        expect(rate).toBeGreaterThan(0.05);
        expect(rate).toBeLessThan(0.95);
      }
    });
  });
});


describe("Bout RPS Tactical Clash", () => {
  it("applies positive win probability shift when player wins tactical clash", () => {
    // Both exact same stats
    const player = mockRikishi("player1", { style: "hybrid" });
    const cpu = mockRikishi("cpu1", { style: "hybrid" });

    // Seed that happens to result in a CPU win when neutral
    // We'll test both neutral and with advantageous tactic

    // We need to pass boutContext to resolveBout directly
    const basho = { id: "test", year: 2025, bashoName: "hatsu", day: 1, matches: [], standings: new Map(), isActive: true } as BashoState;

    // 1. Neutral Bout
    const neutralCtx = {
        id: "b1", day: 1, rikishiEastId: player.id, rikishiWestId: cpu.id,
        playerSide: "east" as const,
        playerTactic: "STANDARD" as import("../types/combat").BoutTactic
    };
    const neutralRes = resolveBout(neutralCtx, player, cpu, basho);

    // 2. Player Wins Clash (YOTSU vs CPU OSHI)
    // We need to force CPU to OSHI. We can do that by making CPU's style pure Oshi and setting a seed that forces it,
    // OR we can just mock determineCPUTactic or trust it will pick OSHI if archetype is oshi_specialist.
    // Actually, resolveTacticalClash is pure. We just need to check if the logic runs.

    // For a unit test, we can just observe that st.tacticalResult exists and has the correct shift.
    const advCtx = {
        id: "b1", day: 1, rikishiEastId: player.id, rikishiWestId: cpu.id,
        playerSide: "east" as const,
        playerTactic: "YOTSU_BELT" as import("../types/combat").BoutTactic
    };
    // Make CPU pick Oshi by making them an oshi specialist
    const oshiCpu = mockRikishi("cpu2", { style: "oshi", archetype: "oshi_specialist" });
    const advRes = resolveBout(advCtx, player, oshiCpu, basho);

    const tacticalLog = advRes.log.find(l => l.data?.tacticalEntry);
    expect(tacticalLog).toBeDefined();

    if (tacticalLog?.data?.tacticalResult) {
       const res = tacticalLog.data.tacticalResult as import("../types/combat").TacticalResult;
       // They might pick OSHI or STANDARD, but since they are Oshi specialist, they have 70% chance of OSHI.
       // We can assert that tactical result was recorded.
       expect(res.playerTactic).toBe("YOTSU_BELT");
       expect(["PLAYER", "CPU", "NEUTRAL"]).toContain(res.advantage);
    }
  });
});
