import { describe, it, expect } from "vitest";
import { resolveBout, simulateBout } from "../bout";
import type { Rikishi, BashoState, BoutResult, TacticalArchetype } from "../types";

function mockRikishi(id: string, overrides: Partial<Rikishi> = {}): Rikishi {
  return {
    id,
    shikona: `Wrestler-${id}`,
    heyaId: `heya-${id}`,
    rank: "maegashira",
    rankNumber: 5,
    division: "makuuchi",
    side: "east",
    weight: 140,
    height: 180,
    style: "hybrid",
    archetype: "all_rounder" as TacticalArchetype,
    power: 50,
    speed: 50,
    balance: 50,
    technique: 50,
    aggression: 50,
    experience: 30,
    adaptability: 50,
    stamina: 50,
    momentum: 50,
    fatigue: 0,
    stats: { strength: 50, technique: 50, speed: 50, stamina: 50, mental: 50, adaptability: 50, balance: 50, weight: 140 },
    favoredKimarite: [],
    weakAgainstStyles: [],
    personalityTraits: [],
    injuryStatus: { isInjured: false, severity: 0, type: "none", location: "", weeksRemaining: 0, weeksToHeal: 0 },
    ...overrides
  } as unknown as Rikishi;
}

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
    for (let i = 0; i < 100; i++) {
      const bout = { id: `bout-upset-${i}`, day: 1, rikishiEastId: "y1", rikishiWestId: "m1" };
      const result = resolveBout(bout, yokozuna, maegashira, basho);
      if (result.winner === "west") {
        expect(result.upset).toBe(true);
        foundUpset = true;
        break;
      }
    }
    // With 100 attempts, at least one upset should occur (probabilistic but very likely)
    expect(foundUpset).toBe(true);
  });

  it("should detect kinboshi when maegashira beats yokozuna", () => {
    const yokozuna = mockRikishi("y1", { shikona: "Yokozuna", rank: "yokozuna", rankNumber: 1 });
    const maegashira = mockRikishi("m1", { shikona: "Maegashira", rank: "maegashira", rankNumber: 10 });
    const basho = mockBasho();

    let foundKinboshi = false;
    for (let i = 0; i < 200; i++) {
      const bout = { id: `bout-kin-${i}`, day: 1, rikishiEastId: "y1", rikishiWestId: "m1" };
      const result = resolveBout(bout, yokozuna, maegashira, basho);
      if (result.winner === "west" && (result as any).isKinboshi) {
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
      const bout = { id: `bout-div-${i}`, day: 1, rikishiEastId: "e1", rikishiWestId: "w1" };
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

    expect((result as any).pbpLines).toBeDefined();
    expect((result as any).pbpLines.length).toBeGreaterThan(0);
    expect((result as any).pbp).toBeDefined();
    expect((result as any).pbp.length).toBeGreaterThan(0);
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
            const east = mockRikishi("e1", { archetype: archA, style: archA.includes("oshi") ? "oshi" : archA.includes("yotsu") ? "yotsu" : "hybrid" });
            const west = mockRikishi("w1", { archetype: archB, style: archB.includes("oshi") ? "oshi" : archB.includes("yotsu") ? "yotsu" : "hybrid" });
            const bout = { id: `tac-${key}-${i}`, day: 1, rikishiEastId: "e1", rikishiWestId: "w1" };
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
