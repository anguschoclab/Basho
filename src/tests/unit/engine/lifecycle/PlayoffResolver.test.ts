import { describe, it, expect } from "vitest";
import { resolvePlayoffs } from "@/engine/lifecycle/PlayoffResolver";
import type { Rikishi } from "@/engine/types/rikishi";
import type { BashoState, BashoName } from "@/engine/types/basho";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";

function makeRikishi(id: string, overrides: Partial<Rikishi> = {}): Rikishi {
  return MockFactory.createRikishi(id, {
    division: "makuuchi",
    rank: "maegashira",
    heyaId: "test-heya",
    stats: {
      power: 60,
      speed: 60,
      technique: 60,
      weight: 140,
      stamina: 60,
      mental: 60,
      adaptability: 60,
      balance: 60,
      aggression: 60,
      experience: 10,
    },
    ...overrides,
  });
}

function makeBasho(): BashoState {
  return {
    id: "test-basho",
    year: 2026,
    bashoNumber: 1,
    bashoName: "hatsu" as BashoName,
    day: 15,
    matches: [],
    standings: new Map(),
    isActive: true,
  };
}

describe("PlayoffResolver (Bug 13 - missing injury side-effects)", () => {
  it("Test 14.1: resolves single-elimination playoff with 2 rikishi", () => {
    const r1 = makeRikishi("r1", { rank: "yokozuna" });
    const r2 = makeRikishi("r2", { rank: "ozeki" });
    const basho = makeBasho();
    const world = MockFactory.createWorld({
      rikishi: new Map([
        ["r1", r1],
        ["r2", r2],
      ]),
      currentBasho: basho,
      sponsorPool: { sponsors: new Map(), koenkais: new Map() } as any,
      rivalriesState: { pairs: {}, version: "1.0.0" },
    });
    const result = resolvePlayoffs(world, basho, ["r1", "r2"]);
    expect(result).toBeDefined();
    expect(result.winner).toBeDefined();
  });

  it("Test 14.2: resolves playoff with 3 rikishi", () => {
    const rikishi = new Map<string, Rikishi>();
    for (let i = 1; i <= 3; i++) rikishi.set(`r${i}`, makeRikishi(`r${i}`));
    const basho = makeBasho();
    const world = MockFactory.createWorld({
      rikishi,
      currentBasho: basho,
      sponsorPool: { sponsors: new Map(), koenkais: new Map() } as any,
      rivalriesState: { pairs: {}, version: "1.0.0" },
    });
    const result = resolvePlayoffs(world, basho, ["r1", "r2", "r3"]);
    expect(result).toBeDefined();
    expect(result.winner).toBeDefined();
  });

  it("Test 14.3: resolves playoff with 4 rikishi", () => {
    const rikishi = new Map<string, Rikishi>();
    for (let i = 1; i <= 4; i++) rikishi.set(`r${i}`, makeRikishi(`r${i}`));
    const basho = makeBasho();
    const world = MockFactory.createWorld({
      rikishi,
      currentBasho: basho,
      sponsorPool: { sponsors: new Map(), koenkais: new Map() } as any,
      rivalriesState: { pairs: {}, version: "1.0.0" },
    });
    const result = resolvePlayoffs(world, basho, ["r1", "r2", "r3", "r4"]);
    expect(result).toBeDefined();
    expect(result.winner).toBeDefined();
  });

  it("Test 14.4: sets match.result on playoff matches", () => {
    const r1 = makeRikishi("r1");
    const r2 = makeRikishi("r2");
    const basho = makeBasho();
    const world = MockFactory.createWorld({
      rikishi: new Map([
        ["r1", r1],
        ["r2", r2],
      ]),
      currentBasho: basho,
      sponsorPool: { sponsors: new Map(), koenkais: new Map() } as any,
      rivalriesState: { pairs: {}, version: "1.0.0" },
    });
    const result = resolvePlayoffs(world, basho, ["r1", "r2"]);
    expect(result.matches).toBeDefined();
    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.matches[0].result).toBeDefined();
  });

  it("Test 14.5: handles single rikishi (no playoff needed)", () => {
    const r1 = makeRikishi("r1");
    const basho = makeBasho();
    const world = MockFactory.createWorld({ rikishi: new Map([["r1", r1]]), currentBasho: basho });
    const result = resolvePlayoffs(world, basho, ["r1"]);
    expect(result.winner).toBe("r1");
  });

  it("Test 14.6: handles empty candidates gracefully", () => {
    const basho = makeBasho();
    const world = MockFactory.createWorld({ currentBasho: basho });
    expect(() => resolvePlayoffs(world, basho, [])).not.toThrow();
  });

  it("Test 14.7: handles missing rikishi gracefully", () => {
    const basho = makeBasho();
    const world = MockFactory.createWorld({ currentBasho: basho });
    expect(() => resolvePlayoffs(world, basho, ["ghost1", "ghost2"])).not.toThrow();
  });

  it("Test 14.8: playoff winner should be one of the candidates", () => {
    const r1 = makeRikishi("r1");
    const r2 = makeRikishi("r2");
    const basho = makeBasho();
    const world = MockFactory.createWorld({
      rikishi: new Map([
        ["r1", r1],
        ["r2", r2],
      ]),
      currentBasho: basho,
      sponsorPool: { sponsors: new Map(), koenkais: new Map() } as any,
      rivalriesState: { pairs: {}, version: "1.0.0" },
    });
    const result = resolvePlayoffs(world, basho, ["r1", "r2"]);
    expect(["r1", "r2"]).toContain(result.winner);
  });

  it("Test 14.9: playoff matches should have correct day (16+)", () => {
    const r1 = makeRikishi("r1");
    const r2 = makeRikishi("r2");
    const basho = makeBasho();
    const world = MockFactory.createWorld({
      rikishi: new Map([
        ["r1", r1],
        ["r2", r2],
      ]),
      currentBasho: basho,
      sponsorPool: { sponsors: new Map(), koenkais: new Map() } as any,
      rivalriesState: { pairs: {}, version: "1.0.0" },
    });
    const result = resolvePlayoffs(world, basho, ["r1", "r2"]);
    expect(result.matches[0].day).toBeGreaterThanOrEqual(16);
  });

  it("Test 14.10: resolves playoff with odd number (bye handling)", () => {
    const rikishi = new Map<string, Rikishi>();
    for (let i = 1; i <= 5; i++) rikishi.set(`r${i}`, makeRikishi(`r${i}`));
    const basho = makeBasho();
    const world = MockFactory.createWorld({
      rikishi,
      currentBasho: basho,
      sponsorPool: { sponsors: new Map(), koenkais: new Map() } as any,
      rivalriesState: { pairs: {}, version: "1.0.0" },
    });
    const result = resolvePlayoffs(world, basho, ["r1", "r2", "r3", "r4", "r5"]);
    expect(result.winner).toBeDefined();
    expect(["r1", "r2", "r3", "r4", "r5"]).toContain(result.winner);
  });
});
