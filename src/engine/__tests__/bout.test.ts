import { describe, it, expect } from "vitest";
import { mockRikishi } from "./utils";
import { resolveBout, simulateBout } from "../bout/boutResolver";
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

    console.log("BOUT RESULT:", { 
      winner: result.winner, 
      kimarite: result.kimarite, 
      pbpLen: result.pbpLines?.length,
      logLen: result.log.length 
    });

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
    const east = mockRikishi("e1", { shikona: "Asayama", style: "hybrid", archetype: "hybrid" as any });
    const west = mockRikishi("w1", { shikona: "Takafuji", style: "hybrid", archetype: "hybrid" as any });
    const basho = mockBasho();

    const kimariteSet = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const east = mockRikishi(`e-${i}`, { shikona: "Asayama", style: "hybrid", archetype: "hybrid" as any });
      const west = mockRikishi(`w-${i}`, { shikona: "Takafuji", style: "hybrid", archetype: "hybrid" as any });
      const bout = { id: `bout-div-${i}`, day: 1, rikishiEastId: east.id, rikishiWestId: west.id };
      const result = resolveBout(bout, east, west, basho);
      kimariteSet.add(result.kimarite);
    }

    // With 100 bouts, we expect at least 5 unique techniques
    expect(kimariteSet.size).toBeGreaterThanOrEqual(5);
  });

  it("should generate PBP lines for narrative consumption", () => {
    const east = mockRikishi("e1", { shikona: "Asayama" });
    const west = mockRikishi("w1", { shikona: "Takafuji" });
    const basho = mockBasho();

    const result = resolveBout(
      { id: "bout-pbp", day: 1, rikishiEastId: "e1", rikishiWestId: "w1" },
      east, west, basho
    );

    expect(result.pbpLines).toBeDefined();
    expect(result.pbpLines?.length).toBeGreaterThan(0);
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
      const archetypes: import("../types/combat").CombatArchetype[] = ["oshi", "yotsu", "trickster"];
      const results: Record<string, number> = {};

      for (const archA of archetypes) {
        for (const archB of archetypes) {
          if (archA === archB) continue;
          const key = `${archA}_vs_${archB}`;
          let eastWins = 0;
          for (let i = 0; i < 50; i++) {
            const east = mockRikishi(`e-${i}`, { archetype: archA as any, style: archA.includes("oshi") ? "oshi" : "yotsu" });
            const west = mockRikishi(`w-${i}`, { archetype: archB as any, style: archB.includes("oshi") ? "oshi" : "yotsu" });
            const bout = { id: `tac-${key}-${i}`, day: 1, rikishiEastId: `e-${i}`, rikishiWestId: `w-${i}` };
            const result = resolveBout(bout, east, west, mockBasho());
            if (result.winner === "east") eastWins++;
          }
          results[key] = eastWins / 50;
        }
      }

      for (const [key, rate] of Object.entries(results)) {
        expect(rate).toBeGreaterThan(0.01);
        expect(rate).toBeLessThan(0.99);
      }
    });
  });

  describe("Phase 1: Henka Check", () => {
    it("allows Tricksters to win instantly with Henka", () => {
      const trickster = mockRikishi("e1", { shikona: "Ura", archetype: "trickster" as any, style: "yotsu" });
      trickster.combatProfile = {
        archetype: "trickster",
        familyPreferences: { push: 0, belt: 0, trick: 100, speed: 0 },
        preferredGrip: "none",
        preferredGripDepth: "standard",
        statModifiers: {}
      };
      trickster.technique = 100;
      trickster.stats.technique = 100;

      const dummy = mockRikishi("w1", { shikona: "Dummy", archetype: "oshi" as any, style: "oshi" });
      dummy.combatProfile = {
        archetype: "oshi",
        familyPreferences: { push: 100, belt: 0, trick: 0, speed: 0 },
        preferredGrip: "none",
        preferredGripDepth: "standard",
        statModifiers: {}
      };
      dummy.speed = 1;
      dummy.stats.speed = 1;
      dummy.balance = 1;
      dummy.stats.balance = 1;

      let earlyWins = 0;
      for (let i = 0; i < 50; i++) {
          const result = simulateBout(trickster, dummy, `test-henka-${i}`);
          if (result.log.some(l => l.data?.trick === "henka") && result.winner === "east") earlyWins++;
      }
      expect(earlyWins).toBeGreaterThan(0);
    });
  });

});

describe("Yokozuna Meta Balance", () => {
  it("ensures Yokozunas win ~85% of matches despite tricksters", () => {
     const yokozuna = mockRikishi("e1", { shikona: "Hakuho", archetype: "yotsu" as any, style: "yotsu", rank: "yokozuna", rankNumber: 1 });
     yokozuna.combatProfile = {
       archetype: "yotsu",
       familyPreferences: { push: 20, belt: 80, trick: 0, speed: 0 },
       preferredGrip: "none",
       preferredGripDepth: "deep",
       statModifiers: {}
     };
     yokozuna.power = 200;
     yokozuna.stats.strength = 200;
     yokozuna.speed = 150;
     yokozuna.stats.speed = 150;
     yokozuna.balance = 200;
     yokozuna.stats.balance = 200;
     yokozuna.technique = 200;
     yokozuna.stats.technique = 200;

     const maegashira = mockRikishi("w1", { shikona: "Ura", archetype: "trickster" as any, style: "yotsu", rank: "maegashira", rankNumber: 4 });
     maegashira.combatProfile = {
       archetype: "trickster",
       familyPreferences: { push: 10, belt: 10, trick: 80, speed: 0 },
       preferredGrip: "none",
       preferredGripDepth: "standard",
       statModifiers: {}
     };
     maegashira.power = 10;
     maegashira.stats.strength = 10;
     maegashira.speed = 85;
     maegashira.stats.speed = 85;
     maegashira.balance = 60;
     maegashira.stats.balance = 60;
     maegashira.technique = 85;
     maegashira.stats.technique = 85;

     let yWins = 0;
     for (let i = 0; i < 100; i++) {
         const result = simulateBout(yokozuna, maegashira, `test-yoko-${i}`);
         if (result.winner === "east") yWins++;
     }

     expect(yWins).toBeGreaterThan(75);
  });
});
