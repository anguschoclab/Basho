import { describe, it, expect } from "vitest";
import { RivalryService } from "@/engine/systems/narrative/RivalryService";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { mockRikishi, makeMockWorld, makeMockHeya } from "../../utils";
import type { WorldState } from "@/engine/types/world";
import type { BoutResult } from "@/engine/types/basho";

function makeWorld(aId: string, bId: string, overrides: Partial<WorldState> = {}): WorldState {
  const a = mockRikishi(aId, { heyaId: "h1" });
  const b = mockRikishi(bId, { heyaId: "h2" });
  const heyaA = makeMockHeya("h1", { rikishiIds: [aId] });
  const heyaB = makeMockHeya("h2", { rikishiIds: [bId] });
  const world = makeMockWorld({
    rikishi: new Map([
      [a.id, a],
      [b.id, b],
    ]),
    ...overrides,
  });
  world.heyas.set("h1", heyaA);
  world.heyas.set("h2", heyaB);
  return world as WorldState;
}

function makeBoutResult(
  winnerId: string,
  loserId: string,
  overrides: Partial<BoutResult> = {}
): BoutResult {
  return {
    boutId: "bout-1",
    day: 1,
    winnerRikishiId: winnerId,
    loserRikishiId: loserId,
    winnerHeyaId: "h1",
    loserHeyaId: "h2",
    kimarite: "yorikiri",
    duration: 10,
    ...overrides,
  } as BoutResult;
}

describe("RivalryService.ensureRivalriesState", () => {
  it("creates rivalry state if none exists", () => {
    const world = makeWorld("r1", "r2");
    const state = RivalryService.ensureRivalriesState(world);
    expect(state).toBeDefined();
    expect(state.version).toBe("1.0.0");
    expect(state.pairs).toEqual({});
  });

  it("returns existing rivalry state if present", () => {
    const world = makeWorld("r1", "r2");
    const existing = { version: "2.0.0", pairs: { "r1|r2": {} } } as any;
    world.rivalriesState = existing;
    const state = RivalryService.ensureRivalriesState(world);
    expect(state.version).toBe("2.0.0");
  });
});

describe("RivalryService.makeRivalryKey", () => {
  it("produces canonical key with smaller ID first", () => {
    expect(RivalryService.makeRivalryKey("aaa", "bbb")).toBe("aaa|bbb");
    expect(RivalryService.makeRivalryKey("bbb", "aaa")).toBe("aaa|bbb");
  });

  it("is idempotent regardless of argument order", () => {
    const k1 = RivalryService.makeRivalryKey("r1", "r2");
    const k2 = RivalryService.makeRivalryKey("r2", "r1");
    expect(k1).toBe(k2);
  });
});

describe("RivalryService.createFreshPair", () => {
  it("creates a pair with zero heat and default tone", () => {
    const world = makeWorld("r1", "r2");
    const pair = RivalryService.createFreshPair("r1", "r2", world);
    expect(pair.heat).toBe(0);
    expect(pair.tone).toBe("respect");
    expect(pair.meetings).toBe(0);
    expect(pair.aWins).toBe(0);
    expect(pair.bWins).toBe(0);
    expect(pair.sameHeya).toBe(false);
  });

  it("orders IDs canonically (smaller first)", () => {
    const world = makeWorld("r1", "r2");
    const pair = RivalryService.createFreshPair("r2", "r1", world);
    expect(pair.aId).toBe("r1");
    expect(pair.bId).toBe("r2");
  });

  it("detects same-heya rikishi", () => {
    const a = mockRikishi("r1", { heyaId: "h1" });
    const b = mockRikishi("r2", { heyaId: "h1" });
    const world = makeMockWorld({
      rikishi: new Map([
        ["r1", a],
        ["r2", b],
      ]),
    });
    const pair = RivalryService.createFreshPair("r1", "r2", world);
    expect(pair.sameHeya).toBe(true);
  });
});

describe("RivalryService.onBoutResolved", () => {
  it("returns empty impact when winner/loser IDs are missing", () => {
    const world = makeWorld("r1", "r2");
    const impact = RivalryService.onBoutResolved(world, {
      result: { winnerRikishiId: undefined, loserRikishiId: undefined } as any,
    });
    expect(impact.worldFields?.rivalriesState).toBeUndefined();
  });

  it("creates a new rivalry pair from bout result", () => {
    const world = makeWorld("r1", "r2");
    const result = makeBoutResult("r1", "r2");
    const impact = RivalryService.onBoutResolved(world, { result, day: 1 });
    const updated = resolveImpacts(world, [impact]);
    const state = updated.rivalriesState!;
    const key = RivalryService.makeRivalryKey("r1", "r2");
    expect(state.pairs[key]).toBeDefined();
    expect(state.pairs[key].meetings).toBe(1);
  });

  it("updates stable-level heya rivalry pairs", () => {
    const world = makeWorld("r1", "r2");
    const result = makeBoutResult("r1", "r2");
    const impact = RivalryService.onBoutResolved(world, { result, day: 1 });
    const updated = resolveImpacts(world, [impact]);
    const state = updated.rivalriesState!;
    expect(state.heyaRivalryPairs).toBeDefined();
    const hKey = RivalryService.makeRivalryKey("h1", "h2");
    expect(state.heyaRivalryPairs![hKey]).toBeDefined();
  });

  it("refreshes sameHeya when a merger has moved rikishi into the same stable", () => {
    const world = makeWorld("r1", "r2");
    // Pair created while in different stables
    const created = RivalryService.createFreshPair("r1", "r2", world);
    expect(created.sameHeya).toBe(false);
    const key = RivalryService.makeRivalryKey("r1", "r2");
    world.rivalriesState = {
      version: "1.0.0",
      pairs: { [key]: created },
    } as any;
    // Merger moved r2 into r1's stable
    world.rikishi.get("r2")!.heyaId = "h1";

    const impact = RivalryService.onBoutResolved(world, {
      result: makeBoutResult("r1", "r2"),
      day: 1,
    });
    const updated = resolveImpacts(world, [impact]);
    expect(updated.rivalriesState!.pairs[key].sameHeya).toBe(true);
  });
});

describe("RivalryService.applyWeeklyDecay", () => {
  it("returns impact with empty pairs when no rivalry state exists", () => {
    const world = makeWorld("r1", "r2");
    const impact = RivalryService.applyWeeklyDecay(world);
    const state = impact.worldFields?.rivalriesState as any;
    expect(state).toBeDefined();
    expect(state.pairs).toEqual({});
  });

  it("decays heat over time", () => {
    const world = makeWorld("r1", "r2");
    // Seed a rivalry with some heat
    const seedImpact = RivalryService.seedInitialRivalries(world);
    const seeded = resolveImpacts(world, [seedImpact]);
    const state = seeded.rivalriesState!;
    const pairKeys = Object.keys(state.pairs);
    if (pairKeys.length > 0) {
      const beforeHeat = state.pairs[pairKeys[0]].heat;
      // Advance week and decay
      seeded.calendar = { currentWeek: 20 };
      const decayImpact = RivalryService.applyWeeklyDecay(seeded);
      const decayed = resolveImpacts(seeded, [decayImpact]);
      const afterHeat = decayed.rivalriesState!.pairs[pairKeys[0]].heat;
      expect(afterHeat).toBeLessThanOrEqual(beforeHeat);
    }
  });

  it("preserves heyaRivalryPairs across decay", () => {
    const world = makeWorld("r1", "r2");
    // Build a stable-level rivalry via a resolved bout
    const boutImpact = RivalryService.onBoutResolved(world, {
      result: makeBoutResult("r1", "r2"),
      day: 1,
    });
    const withBout = resolveImpacts(world, [boutImpact]);
    expect(Object.keys(withBout.rivalriesState!.heyaRivalryPairs ?? {}).length).toBeGreaterThan(0);

    const decayImpact = RivalryService.applyWeeklyDecay(withBout);
    const decayed = resolveImpacts(withBout, [decayImpact]);
    expect(Object.keys(decayed.rivalriesState!.heyaRivalryPairs ?? {}).length).toBeGreaterThan(0);
  });

  it("derives tone from decayed values, not the pre-decay pair", () => {
    const world = makeWorld("r1", "r2");
    // A public_hype pair: meetings >= 4, heat >= 35, spite < 35.
    // One decay tick (rate 1.5 long-gap) drops heat 36 → 34.5, below the
    // threshold — the tone must reflect the decayed state on this tick.
    const key = RivalryService.makeRivalryKey("r1", "r2");
    world.rivalriesState = {
      version: "1.0.0",
      pairs: {
        [key]: {
          key,
          aId: "r1",
          bId: "r2",
          heat: 36,
          meetings: 10,
          lastMetWeek: 0,
          aWins: 5,
          bWins: 5,
          closeness: 0,
          spite: 0,
          tone: "public_hype",
          triggers: {},
          sameHeya: false,
        },
      },
    } as any;
    world.calendar = { currentWeek: 40 } as any;

    const decayed = resolveImpacts(world, [RivalryService.applyWeeklyDecay(world)]);
    const pair = decayed.rivalriesState!.pairs[key];
    expect(pair.tone).toBe("respect");
  });
});

describe("RivalryService.seedInitialRivalries", () => {
  it("seeds rivalries for sekitori rikishi", () => {
    const a = mockRikishi("r1", { heyaId: "h1", division: "makuuchi", style: "oshi" });
    const b = mockRikishi("r2", { heyaId: "h2", division: "makuuchi", style: "yotsu" });
    const world = makeMockWorld({
      rikishi: new Map([
        ["r1", a],
        ["r2", b],
      ]),
    });
    world.heyas.set("h1", makeMockHeya("h1", { rikishiIds: ["r1"] }));
    world.heyas.set("h2", makeMockHeya("h2", { rikishiIds: ["r2"] }));

    const impact = RivalryService.seedInitialRivalries(world);
    const updated = resolveImpacts(world, [impact]);
    const state = updated.rivalriesState!;
    expect(Object.keys(state.pairs).length).toBeGreaterThan(0);
  });

  it("does not seed rivalries for same-heya rikishi", () => {
    const a = mockRikishi("r1", { heyaId: "h1", division: "makuuchi" });
    const b = mockRikishi("r2", { heyaId: "h1", division: "makuuchi" });
    const world = makeMockWorld({
      rikishi: new Map([
        ["r1", a],
        ["r2", b],
      ]),
    });
    world.heyas.set("h1", makeMockHeya("h1", { rikishiIds: ["r1", "r2"] }));

    const impact = RivalryService.seedInitialRivalries(world);
    const updated = resolveImpacts(world, [impact]);
    const state = updated.rivalriesState!;
    // Same-heya pairs should not be seeded
    const key = RivalryService.makeRivalryKey("r1", "r2");
    expect(state.pairs[key]).toBeUndefined();
  });
});
