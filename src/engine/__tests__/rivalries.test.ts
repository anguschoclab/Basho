import { describe, it, expect } from "vitest";
import {
  createDefaultRivalriesState,
  makeRivalryKey,
  updateRivalriesFromBout,
  applyRivalryWeeklyDecay,
  getRivalriesForRikishi,
  buildRivalryDigest,
  getRivalryBoutModifiers
} from "../rivalries";
import { WorldState, Rikishi, BoutResult } from "../types";

function createMockWorld(): WorldState {
  return {
    seed: "test-seed",
    week: 1,
    rikishi: new Map([
      ["a", { id: "a", shikona: "Alpha", heyaId: "h1" } as Rikishi],
      ["b", { id: "b", shikona: "Beta", heyaId: "h2" } as Rikishi],
      ["c", { id: "c", shikona: "Gamma", heyaId: "h1" } as Rikishi], // Same heya as Alpha
    ]),
    // other mocks omitted for brevity
  } as unknown as WorldState;
}

describe("Rivalries System", () => {
  it("should create and manage state with canonical keys", () => {
    const state = createDefaultRivalriesState();
    expect(state.pairs).toEqual({});
    
    expect(makeRivalryKey("a", "b")).toBe("a|b");
    expect(makeRivalryKey("b", "a")).toBe("a|b"); // Canonical
  });

  it("should update rivalry state after a bout", () => {
    let state = createDefaultRivalriesState();
    const world = createMockWorld();
    
    const result = {
      winnerRikishiId: "a",
      loserRikishiId: "b",
      kimarite: "yorikiri",
      duration: 10,
      upset: true
    } as unknown as BoutResult;

    const update = updateRivalriesFromBout({ state, world, result, day: 1 });
    state = update.state;
    
    const pair = state.pairs["a|b"];
    expect(pair).toBeDefined();
    expect(pair.aWins).toBe(1);
    expect(pair.bWins).toBe(0);
    expect(pair.meetings).toBe(1);
    expect(pair.heat).toBeGreaterThan(0);
    expect(pair.sameHeya).toBe(false);
    expect(pair.triggers.upset).toBeGreaterThan(0);
  });

  it("should detect same-heya matchups", () => {
    let state = createDefaultRivalriesState();
    const world = createMockWorld();
    
    const result = {
      winnerRikishiId: "a",
      loserRikishiId: "c", // Both heyaId: "h1"
      kimarite: "oshidashi"
    } as unknown as BoutResult;

    const update = updateRivalriesFromBout({ state, world, result });
    expect(update.state.pairs["a|c"].sameHeya).toBe(true);
    expect(update.state.pairs["a|c"].tone).toBe("respect");
  });

  it("should decay rivalry heat over time and cull cold ones", () => {
    let state = createDefaultRivalriesState();
    const world = createMockWorld();
    
    const result = { winnerRikishiId: "a", loserRikishiId: "b" } as unknown as BoutResult;
    state = updateRivalriesFromBout({ state, world, result }).state;
    
    const initialHeat = state.pairs["a|b"].heat;
    
    // Decay lightly
    state = applyRivalryWeeklyDecay(state, world.week! + 5);
    expect(state.pairs["a|b"].heat).toBeLessThan(initialHeat);

    // Apply massive decay to force culling (week 50)
    // Manually drop heat
    state.pairs["a|b"].heat = 2;
    state = applyRivalryWeeklyDecay(state, world.week! + 50);
    
    expect(state.pairs["a|b"]).toBeUndefined();
  });

  it("should provide correct bout modifiers based on heat/closeness", () => {
    let state = createDefaultRivalriesState();
    const world = createMockWorld();
    
    const result = { winnerRikishiId: "a", loserRikishiId: "b" } as unknown as BoutResult;
    
    // Simulate intense rivalry
    for(let i=0; i<5; i++) {
        state = updateRivalriesFromBout({ state, world, result, isKinboshi: true, domination01: 0.9 }).state;
    }

    const mods = getRivalryBoutModifiers({ state, aId: "a", bId: "b" });
    expect(mods.tension).toBeGreaterThan(0);
    expect(mods.upsetBonus).toBeGreaterThan(0);
  });

  it("should build digest sorted by heat", () => {
    let state = createDefaultRivalriesState();
    const world = createMockWorld();
    
    // A vs B is hot
    for(let i=0; i<3; i++) {
        state = updateRivalriesFromBout({ state, world, result: { winnerRikishiId: "a", loserRikishiId: "b" } as unknown as BoutResult, isTitleStakes: true }).state;
    }
    
    // A vs C is mild
    state = updateRivalriesFromBout({ state, world, result: { winnerRikishiId: "a", loserRikishiId: "c" } }).state;

    const digest = buildRivalryDigest({ state, world, rikishiId: "a" });
    expect(digest.length).toBe(2);
    expect(digest[0].rivalId).toBe("b"); // B should be first due to higher heat
    expect(digest[1].rivalId).toBe("c");
  });
});
