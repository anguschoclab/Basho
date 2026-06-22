import { describe, it, expect } from "vitest";
import { makeMockWorld, mockRikishi } from "./utils";
import type { WorldState } from "@/engine/types/world";

function countRetired(world: WorldState): number {
  const active = Array.from(world.rikishi.values()).filter((r) => r.isRetired).length;
  return active + (world.historicalRikishi?.size ?? 0);
}

describe("diagnostic retiredTotal counting", () => {
  it("counts retirees that live in historicalRikishi", () => {
    const world = makeMockWorld({
      rikishi: new Map([["a-1", mockRikishi("a-1", { isRetired: false })]]),
      historicalRikishi: new Map([
        ["h-1", mockRikishi("h-1", { isRetired: true })],
        ["h-2", mockRikishi("h-2", { isRetired: true })],
      ]),
    });
    expect(countRetired(world)).toBe(2);
  });
});
