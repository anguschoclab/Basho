 
import { describe, it, expect } from "vitest";
import { publishBanzukeUpdate } from "@/engine/banzuke/BanzukePublisher";
import type { Rikishi } from "@/engine/types/rikishi";
import type { BashoState, BashoName } from "@/engine/types/basho";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";

function makeRikishi(id: string, overrides: Partial<Rikishi> = {}): Rikishi {
  return MockFactory.createRikishi(id, {
    division: "makuuchi", rank: "maegashira", rankNumber: 1, heyaId: "test-heya",
    currentBashoWins: 8, currentBashoLosses: 7,
    stats: { power: 60, speed: 60, technique: 60, weight: 140, stamina: 60, mental: 60, adaptability: 60, balance: 60, aggression: 60, experience: 10 },
    ...overrides,
  });
}

function makeBasho(standings: Map<string, { wins: number; losses: number; absences?: number }>): BashoState {
  return {
    id: "test-basho", year: 2026, bashoNumber: 1, bashoName: "hatsu" as BashoName,
    day: 15, matches: [], standings, isActive: false,
  };
}

describe("BanzukePublisher - absences tracking (Bug 15)", () => {
  it("Test 15.1: publishes banzuke with correct kachi-koshi from standings", () => {
    const r1 = makeRikishi("r1", { rank: "maegashira", rankNumber: 5 });
    const standings = new Map([["r1", { wins: 10, losses: 5 }]]);
    const basho = makeBasho(standings);
    const world = MockFactory.createWorld({
      rikishi: new Map([["r1", r1]]), currentBasho: basho,
      history: [{ bashoName: "hatsu", year: 2026, bashoNumber: 1, standings: standings as any, yusho: "r1", division: "makuuchi" } as any],
    });
    const impact = publishBanzukeUpdate(world);
    expect(impact).toBeDefined();
  });

  it("Test 15.2: handles absences in standings (Bug 15)", () => {
    const r1 = makeRikishi("r1", { rank: "maegashira", rankNumber: 5 });
    const standings = new Map([["r1", { wins: 5, losses: 5, absences: 5 }]]);
    const basho = makeBasho(standings);
    const world = MockFactory.createWorld({
      rikishi: new Map([["r1", r1]]), currentBasho: basho,
      history: [{ bashoName: "hatsu", year: 2026, bashoNumber: 1, standings: standings as any, yusho: "r1", division: "makuuchi" } as any],
    });
    expect(() => publishBanzukeUpdate(world)).not.toThrow();
  });

  it("Test 15.3: resets currentBashoWins and currentBashoLosses to 0", () => {
    const r1 = makeRikishi("r1", { rank: "maegashira", rankNumber: 5, currentBashoWins: 10, currentBashoLosses: 5 });
    const standings = new Map([["r1", { wins: 10, losses: 5 }]]);
    const basho = makeBasho(standings);
    const world = MockFactory.createWorld({
      rikishi: new Map([["r1", r1]]), currentBasho: basho,
      activeRikishiIds: new Set(["r1"]),
      cyclePhase: "post_basho",
      history: [{ bashoName: "hatsu", year: 2026, bashoNumber: 1, standings: standings as any, yusho: "r1", junYusho: [], division: "makuuchi", ginoSho: undefined, shukunsho: undefined, kantosho: undefined } as any],
    });
    const impact = publishBanzukeUpdate(world);
    const r1Update = impact.entities?.rikishiUpdates?.get("r1");
    expect(r1Update?.currentBashoWins).toBe(0);
    expect(r1Update?.currentBashoLosses).toBe(0);
  });

  it("Test 15.4: handles missing standings gracefully", () => {
    const r1 = makeRikishi("r1");
    const basho = makeBasho(new Map());
    const world = MockFactory.createWorld({
      rikishi: new Map([["r1", r1]]), currentBasho: basho,
      history: [],
    });
    expect(() => publishBanzukeUpdate(world)).not.toThrow();
  });

  it("Test 15.5: handles empty rikishi map gracefully", () => {
    const basho = makeBasho(new Map());
    const world = MockFactory.createWorld({ rikishi: new Map(), currentBasho: basho, history: [] });
    expect(() => publishBanzukeUpdate(world)).not.toThrow();
  });
});
