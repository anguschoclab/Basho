import { describe, it, expect } from "vitest";
import { getPlayerHeya } from "@/engine/queries";
import type { WorldState } from "@/engine/types/world";
import type { Heya } from "@/engine/types/heya";

function makeWorld(playerHeyaId?: string, heyas?: Map<string, Heya>): WorldState {
  return {
    playerHeyaId,
    heyas: heyas ?? new Map(),
  } as unknown as WorldState;
}

describe("getPlayerHeya", () => {
  it("returns the player's heya when playerHeyaId is set", () => {
    const heya = { id: "h1", name: "Test Heya" } as unknown as Heya;
    const world = makeWorld("h1", new Map([["h1", heya]]));
    expect(getPlayerHeya(world)).toBe(heya);
  });

  it("returns undefined when playerHeyaId is not set", () => {
    const world = makeWorld(undefined, new Map());
    expect(getPlayerHeya(world)).toBeUndefined();
  });

  it("returns undefined when heya not found", () => {
    const world = makeWorld("nonexistent", new Map());
    expect(getPlayerHeya(world)).toBeUndefined();
  });
});
