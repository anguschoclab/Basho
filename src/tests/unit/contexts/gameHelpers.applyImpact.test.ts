import { describe, it, expect } from "vitest";
import { applyImpact, applyImpacts } from "@/contexts/gameHelpers";
import type { GameState } from "@/contexts/gameTypes";
import type { WorldState } from "@/engine/types/world";
import type { StateImpact } from "@/engine/core/StateImpact";

function makeState(world: WorldState | null): GameState {
  return {
    phase: "menu",
    world,
    digest: null,
    currentBoutIndex: 0,
    lastBoutResult: null,
    playerHeyaId: "h1",
    playerOyakataId: "o1",
    isAutoPlaying: false,
    boutTactics: {},
  };
}

function makeWorld(): WorldState {
  return {
    year: 1,
    week: 1,
    heyas: new Map(),
    rikishi: new Map(),
  } as unknown as WorldState;
}

function makeImpact(field: string, value: unknown): StateImpact {
  return { worldFields: { [field]: value } } as unknown as StateImpact;
}

describe("applyImpact", () => {
  it("returns new state with world updated", () => {
    const world = makeWorld();
    const state = makeState(world);
    const impact = makeImpact("week", 5);

    const next = applyImpact(state, impact);

    expect(next).not.toBe(state);
    expect(next.world).not.toBe(state.world);
    expect(next.world?.week).toBe(5);
  });

  it("does not mutate input state", () => {
    const world = makeWorld();
    const state = makeState(world);
    const impact = makeImpact("week", 10);

    applyImpact(state, impact);

    expect(state.world?.week).toBe(1);
  });

  it("returns state unchanged when world is null", () => {
    const state = makeState(null);
    const impact = makeImpact("week", 5);

    const next = applyImpact(state, impact);

    expect(next).toBe(state);
  });
});

describe("applyImpacts", () => {
  it("applies multiple impacts in order", () => {
    const world = makeWorld();
    const state = makeState(world);
    const impacts = [makeImpact("week", 3), makeImpact("year", 2)];

    const next = applyImpacts(state, impacts);

    expect(next.world?.week).toBe(3);
    expect(next.world?.year).toBe(2);
  });

  it("returns state unchanged for empty array", () => {
    const world = makeWorld();
    const state = makeState(world);

    const next = applyImpacts(state, []);

    expect(next).toBe(state);
  });

  it("returns state unchanged when world is null", () => {
    const state = makeState(null);
    const impacts = [makeImpact("week", 5)];

    const next = applyImpacts(state, impacts);

    expect(next).toBe(state);
  });
});
