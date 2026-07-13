import { describe, it, expect } from "vitest";
import {
  SparringService,
  assignSparringPair,
  removeSparringPair,
  applyWeeklySparring,
} from "@/engine/systems/training/SparringService";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { mockRikishi, makeMockWorld, makeMockHeya } from "../../utils";
import type { WorldState } from "@/engine/types/world";
import type { SparringPair, SparringState } from "@/engine/types/training";
import { SPARRING_MAX_BLEED } from "@/constants/engine/sparring";

function makeSparringWorld(
  rikishiList: ReturnType<typeof mockRikishi>[],
  sparringPairs?: Map<string, SparringState>
): WorldState {
  const heyaId = rikishiList[0]?.heyaId ?? "h1";
  const heya = makeMockHeya(heyaId, {
    rikishiIds: rikishiList.map((r) => r.id),
  });
  const rikishiMap = new Map(rikishiList.map((r) => [r.id, r]));
  const world = makeMockWorld({
    rikishi: rikishiMap,
    sparringPairs,
  });
  world.heyas.set(heyaId, heya);
  return world as WorldState;
}

function makeSparringPair(
  aId: string,
  bId: string,
  overrides: Partial<SparringPair> = {}
): SparringPair {
  return {
    key: SparringService.makePairKey(aId, bId),
    aId,
    bId,
    chemistry: "neutral",
    weeksActive: 0,
    establishedWeek: 0,
    ...overrides,
  };
}

describe("SparringService.canSpar", () => {
  it("true for same heya, both active", () => {
    const a = mockRikishi("r1", { heyaId: "h1", injured: false });
    const b = mockRikishi("r2", { heyaId: "h1", injured: false });
    expect(SparringService.canSpar(a, b)).toBe(true);
  });

  it("false for different heya", () => {
    const a = mockRikishi("r1", { heyaId: "h1" });
    const b = mockRikishi("r2", { heyaId: "h2" });
    expect(SparringService.canSpar(a, b)).toBe(false);
  });

  it("false for same rikishi", () => {
    const a = mockRikishi("r1", { heyaId: "h1" });
    expect(SparringService.canSpar(a, a)).toBe(false);
  });

  it("false if either injured", () => {
    const a = mockRikishi("r1", { heyaId: "h1", injured: true });
    const b = mockRikishi("r2", { heyaId: "h1", injured: false });
    expect(SparringService.canSpar(a, b)).toBe(false);
  });

  it("false if either retired", () => {
    const a = mockRikishi("r1", { heyaId: "h1", isRetired: true });
    const b = mockRikishi("r2", { heyaId: "h1", isRetired: false });
    expect(SparringService.canSpar(a, b)).toBe(false);
  });
});

describe("SparringService.calculateChemistry", () => {
  it("returns 'rut' for same archetype", () => {
    const a = mockRikishi("r1", { combatProfile: { archetype: "oshi" } as any });
    const b = mockRikishi("r2", { combatProfile: { archetype: "oshi" } as any });
    expect(SparringService.calculateChemistry(a, b)).toBe("rut");
  });

  it("returns 'friction' for push vs tech", () => {
    const a = mockRikishi("r1", { combatProfile: { archetype: "oshi" } as any });
    const b = mockRikishi("r2", { combatProfile: { archetype: "yotsu" } as any });
    expect(SparringService.calculateChemistry(a, b)).toBe("friction");
  });

  it("returns 'friction' for hybrid vs non-hybrid", () => {
    const a = mockRikishi("r1", { combatProfile: { archetype: "hybrid" } as any });
    const b = mockRikishi("r2", { combatProfile: { archetype: "oshi" } as any });
    expect(SparringService.calculateChemistry(a, b)).toBe("friction");
  });

  it("returns 'neutral' for same category (push vs push with different archetypes)", () => {
    const a = mockRikishi("r1", { combatProfile: { archetype: "oshi" } as any });
    const b = mockRikishi("r2", { combatProfile: { archetype: "tsuppari" } as any });
    expect(SparringService.calculateChemistry(a, b)).toBe("neutral");
  });

  it("returns 'neutral' for missing archetype", () => {
    const a = mockRikishi("r1", { combatProfile: {} as any });
    const b = mockRikishi("r2", { combatProfile: { archetype: "oshi" } as any });
    expect(SparringService.calculateChemistry(a, b)).toBe("neutral");
  });
});

describe("SparringService.calculateGrowthDelta", () => {
  it("returns 0 when avgGap < BLEED_THRESHOLD", () => {
    const a = mockRikishi("r1", { power: 52, speed: 51, balance: 50, technique: 51 });
    const b = mockRikishi("r2", { power: 48, speed: 49, balance: 50, technique: 49 });
    expect(SparringService.calculateGrowthDelta(a, b, "neutral")).toBe(0);
  });

  it("returns positive value when gap is large", () => {
    const a = mockRikishi("r1", { power: 90, speed: 90, balance: 90, technique: 90 });
    const b = mockRikishi("r2", { power: 30, speed: 30, balance: 30, technique: 30 });
    const delta = SparringService.calculateGrowthDelta(a, b, "neutral");
    expect(delta).toBeGreaterThan(0);
  });

  it("friction multiplier > neutral multiplier > rut multiplier", () => {
    const a = mockRikishi("r1", { power: 90, speed: 90, balance: 90, technique: 90 });
    const b = mockRikishi("r2", { power: 30, speed: 30, balance: 30, technique: 30 });
    const friction = SparringService.calculateGrowthDelta(a, b, "friction");
    const neutral = SparringService.calculateGrowthDelta(a, b, "neutral");
    const rut = SparringService.calculateGrowthDelta(a, b, "rut");
    expect(friction).toBeGreaterThanOrEqual(neutral);
    expect(neutral).toBeGreaterThanOrEqual(rut);
  });

  it("clamped to MAX_BLEED (2)", () => {
    const a = mockRikishi("r1", { power: 99, speed: 99, balance: 99, technique: 99 });
    const b = mockRikishi("r2", { power: 1, speed: 1, balance: 1, technique: 1 });
    const delta = SparringService.calculateGrowthDelta(a, b, "friction");
    expect(delta).toBeLessThanOrEqual(SPARRING_MAX_BLEED);
  });
});

describe("SparringService.makePairKey", () => {
  it("canonical key regardless of order", () => {
    const key1 = SparringService.makePairKey("r1", "r2");
    const key2 = SparringService.makePairKey("r2", "r1");
    expect(key1).toBe(key2);
    expect(key1).toBe("r1|r2");
  });
});

describe("assignSparringPair", () => {
  it("returns empty impact for invalid rikishi", () => {
    const world = makeSparringWorld([mockRikishi("r1", { heyaId: "h1" })]);
    const impact = assignSparringPair(world, "h1", "r1", "nonexistent", 1);
    expect(impact.worldFields).toBeUndefined();
  });

  it("returns empty impact for ineligible pair (different heya)", () => {
    const a = mockRikishi("r1", { heyaId: "h1" });
    const b = mockRikishi("r2", { heyaId: "h2" });
    const world = makeSparringWorld([a]);
    world.rikishi.set("r2", b);
    const impact = assignSparringPair(world, "h1", "r1", "r2", 1);
    expect(impact.worldFields).toBeUndefined();
  });

  it("returns empty impact if pair already exists", () => {
    const a = mockRikishi("r1", { heyaId: "h1" });
    const b = mockRikishi("r2", { heyaId: "h1" });
    const pair = makeSparringPair("r1", "r2");
    const sparringState: SparringState = { heyaId: "h1", pairs: { [pair.key]: pair } };
    const world = makeSparringWorld([a, b], new Map([["h1", sparringState]]));
    const impact = assignSparringPair(world, "h1", "r1", "r2", 5);
    expect(impact.worldFields).toBeUndefined();
  });

  it("creates pair with correct chemistry and weeksActive=0", () => {
    const a = mockRikishi("r1", { heyaId: "h1", combatProfile: { archetype: "oshi" } as any });
    const b = mockRikishi("r2", { heyaId: "h1", combatProfile: { archetype: "yotsu" } as any });
    const world = makeSparringWorld([a, b]);
    const impact = assignSparringPair(world, "h1", "r1", "r2", 10);
    const updatedWorld = resolveImpacts(world, [impact]);
    const sparringState = updatedWorld.sparringPairs!.get("h1")!;
    const key = SparringService.makePairKey("r1", "r2");
    const pair = sparringState.pairs[key];
    expect(pair).toBeDefined();
    expect(pair.chemistry).toBe("friction");
    expect(pair.weeksActive).toBe(0);
    expect(pair.establishedWeek).toBe(10);
  });
});

describe("removeSparringPair", () => {
  it("returns empty impact if no sparring state", () => {
    const world = makeSparringWorld([mockRikishi("r1", { heyaId: "h1" })]);
    const impact = removeSparringPair(world, "h1", "r1", "r2");
    expect(impact.worldFields).toBeUndefined();
  });

  it("returns empty impact if pair doesn't exist", () => {
    const a = mockRikishi("r1", { heyaId: "h1" });
    const sparringState: SparringState = { heyaId: "h1", pairs: {} };
    const world = makeSparringWorld([a], new Map([["h1", sparringState]]));
    const impact = removeSparringPair(world, "h1", "r1", "r2");
    expect(impact.worldFields).toBeUndefined();
  });

  it("removes pair and updates sparringPairs map", () => {
    const a = mockRikishi("r1", { heyaId: "h1" });
    const b = mockRikishi("r2", { heyaId: "h1" });
    const c = mockRikishi("r3", { heyaId: "h1" });
    const d = mockRikishi("r4", { heyaId: "h1" });
    const pair1 = makeSparringPair("r1", "r2");
    const pair2 = makeSparringPair("r3", "r4");
    const sparringState: SparringState = {
      heyaId: "h1",
      pairs: { [pair1.key]: pair1, [pair2.key]: pair2 },
    };
    const world = makeSparringWorld([a, b, c, d], new Map([["h1", sparringState]]));
    const impact = removeSparringPair(world, "h1", "r1", "r2");
    const updatedWorld = resolveImpacts(world, [impact]);
    const state = updatedWorld.sparringPairs!.get("h1")!;
    expect(state.pairs[pair1.key]).toBeUndefined();
    expect(state.pairs[pair2.key]).toBeDefined();
  });

  it("removes heya from map when no pairs remain", () => {
    const a = mockRikishi("r1", { heyaId: "h1" });
    const b = mockRikishi("r2", { heyaId: "h1" });
    const pair = makeSparringPair("r1", "r2");
    const sparringState: SparringState = { heyaId: "h1", pairs: { [pair.key]: pair } };
    const world = makeSparringWorld([a, b], new Map([["h1", sparringState]]));
    const impact = removeSparringPair(world, "h1", "r1", "r2");
    const updatedWorld = resolveImpacts(world, [impact]);
    expect(updatedWorld.sparringPairs!.has("h1")).toBe(false);
  });
});

describe("applyWeeklySparring", () => {
  it("returns empty impact when no sparringPairs", () => {
    const world = makeSparringWorld([mockRikishi("r1", { heyaId: "h1" })]);
    const impact = applyWeeklySparring(world);
    expect(impact.worldFields).toBeUndefined();
  });

  it("removes pair when rikishi not found", () => {
    const pair = makeSparringPair("r1", "r2");
    const sparringState: SparringState = { heyaId: "h1", pairs: { [pair.key]: pair } };
    const world = makeSparringWorld([], new Map([["h1", sparringState]]));
    const impact = applyWeeklySparring(world);
    const updatedWorld = resolveImpacts(world, [impact]);
    expect(updatedWorld.sparringPairs!.has("h1")).toBe(false);
  });

  it("removes pair when either rikishi injured", () => {
    const a = mockRikishi("r1", { heyaId: "h1", injured: true });
    const b = mockRikishi("r2", { heyaId: "h1", injured: false });
    const pair = makeSparringPair("r1", "r2");
    const sparringState: SparringState = { heyaId: "h1", pairs: { [pair.key]: pair } };
    const world = makeSparringWorld([a, b], new Map([["h1", sparringState]]));
    const impact = applyWeeklySparring(world);
    const updatedWorld = resolveImpacts(world, [impact]);
    expect(updatedWorld.sparringPairs!.has("h1")).toBe(false);
  });

  it("removes pair when either rikishi retired", () => {
    const a = mockRikishi("r1", { heyaId: "h1", isRetired: true });
    const b = mockRikishi("r2", { heyaId: "h1", isRetired: false });
    const pair = makeSparringPair("r1", "r2");
    const sparringState: SparringState = { heyaId: "h1", pairs: { [pair.key]: pair } };
    const world = makeSparringWorld([a, b], new Map([["h1", sparringState]]));
    const impact = applyWeeklySparring(world);
    const updatedWorld = resolveImpacts(world, [impact]);
    expect(updatedWorld.sparringPairs!.has("h1")).toBe(false);
  });

  it("applies stat growth to weaker rikishi", () => {
    const a = mockRikishi("r1", { heyaId: "h1", power: 90, speed: 90, balance: 90, technique: 90 });
    const b = mockRikishi("r2", { heyaId: "h1", power: 30, speed: 30, balance: 30, technique: 30 });
    const pair = makeSparringPair("r1", "r2", { chemistry: "friction" });
    const sparringState: SparringState = { heyaId: "h1", pairs: { [pair.key]: pair } };
    const world = makeSparringWorld([a, b], new Map([["h1", sparringState]]));
    const impact = applyWeeklySparring(world);
    expect(impact.entities?.rikishiUpdates).toBeDefined();
    expect(impact.entities!.rikishiUpdates!.has("r2")).toBe(true);
  });

  it("increments weeksActive even when growthDelta is 0", () => {
    const a = mockRikishi("r1", { heyaId: "h1", power: 50, speed: 50, balance: 50, technique: 50 });
    const b = mockRikishi("r2", { heyaId: "h1", power: 50, speed: 50, balance: 50, technique: 50 });
    const pair = makeSparringPair("r1", "r2", { chemistry: "neutral", weeksActive: 5 });
    const sparringState: SparringState = { heyaId: "h1", pairs: { [pair.key]: pair } };
    const world = makeSparringWorld([a, b], new Map([["h1", sparringState]]));
    const impact = applyWeeklySparring(world);
    const updatedWorld = resolveImpacts(world, [impact]);
    const state = updatedWorld.sparringPairs!.get("h1")!;
    const updatedPair = state.pairs[pair.key];
    expect(updatedPair.weeksActive).toBe(6);
  });

  it("increments weeksActive for all active pairs", () => {
    const a = mockRikishi("r1", { heyaId: "h1", power: 50, speed: 50, balance: 50, technique: 50 });
    const b = mockRikishi("r2", { heyaId: "h1", power: 50, speed: 50, balance: 50, technique: 50 });
    const c = mockRikishi("r3", { heyaId: "h1", power: 80, speed: 80, balance: 80, technique: 80 });
    const d = mockRikishi("r4", { heyaId: "h1", power: 20, speed: 20, balance: 20, technique: 20 });
    const pair1 = makeSparringPair("r1", "r2", { chemistry: "neutral", weeksActive: 3 });
    const pair2 = makeSparringPair("r3", "r4", { chemistry: "friction", weeksActive: 7 });
    const sparringState: SparringState = {
      heyaId: "h1",
      pairs: { [pair1.key]: pair1, [pair2.key]: pair2 },
    };
    const world = makeSparringWorld([a, b, c, d], new Map([["h1", sparringState]]));
    const impact = applyWeeklySparring(world);
    const updatedWorld = resolveImpacts(world, [impact]);
    const state = updatedWorld.sparringPairs!.get("h1")!;
    expect(state.pairs[pair1.key].weeksActive).toBe(4);
    expect(state.pairs[pair2.key].weeksActive).toBe(8);
  });
});
