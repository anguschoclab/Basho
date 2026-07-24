import { describe, it, expect } from "vitest";
import { recruitmentBalanceMultiplier, recruitmentBalanceMultipliers } from "@/engine/systems/generation/competitiveBalance";
import { makeMockWorld, makeMockHeya, mockRikishi } from "../utils";
import type { WorldState } from "@/engine/types/world";

function worldWithStables(spec: Record<string, number>): WorldState {
  // spec: heyaId -> number of SEKITORI (makuuchi) wrestlers in that stable
  const heyas = new Map();
  const rikishi = new Map();
  for (const [heyaId, sekitoriCount] of Object.entries(spec)) {
    const ids: string[] = [];
    for (let i = 0; i < sekitoriCount; i++) {
      const r = mockRikishi(`${heyaId}-s${i}`, {
        heyaId,
        division: "makuuchi",
        rank: "maegashira",
      });
      rikishi.set(r.id, r);
      ids.push(r.id);
    }
    heyas.set(heyaId, makeMockHeya(heyaId, { rikishiIds: ids }));
  }
  return makeMockWorld({ heyas, rikishi });
}

describe("recruitmentBalanceMultiplier", () => {
  it("handicaps a strong stable below 1 and boosts a weak stable above 1", () => {
    const world = worldWithStables({ strong: 8, weak: 0 });
    const strong = recruitmentBalanceMultiplier(world, "strong");
    const weak = recruitmentBalanceMultiplier(world, "weak");
    expect(strong).toBeLessThan(1);
    expect(weak).toBeGreaterThan(1);
    expect(weak).toBeGreaterThan(strong);
  });

  it("returns ~1 for an average-strength stable", () => {
    // Three stables of equal sekitori count → everyone is average.
    const world = worldWithStables({ a: 3, b: 3, c: 3 });
    expect(recruitmentBalanceMultiplier(world, "a")).toBeCloseTo(1, 1);
  });

  it("is bounded so it never zeroes or explodes a bid", () => {
    const world = worldWithStables({ mega: 30, empty: 0 });
    expect(recruitmentBalanceMultiplier(world, "mega")).toBeGreaterThanOrEqual(0.4);
    expect(recruitmentBalanceMultiplier(world, "empty")).toBeLessThanOrEqual(1.8);
  });
});

describe("recruitmentBalanceMultipliers — batch", () => {
  it("returns empty map for empty heyaIds", () => {
    const world = worldWithStables({ a: 3, b: 5 });
    const result = recruitmentBalanceMultipliers(world, []);
    expect(result.size).toBe(0);
  });

  it("returns correct multipliers for a subset of heyas", () => {
    const world = worldWithStables({ a: 5, b: 3, c: 1 });
    const result = recruitmentBalanceMultipliers(world, ["a", "c"]);
    expect(result.size).toBe(2);
    expect(result.has("a")).toBe(true);
    expect(result.has("c")).toBe(true);
    expect(result.has("b")).toBe(false);
    // a is above mean (3), so multiplier < 1
    expect(result.get("a")!).toBeLessThan(1);
    // c is below mean (3), so multiplier > 1
    expect(result.get("c")!).toBeGreaterThan(1);
  });

  it("returns 1.0 for all heyas when all have same strength", () => {
    const world = worldWithStables({ a: 3, b: 3, c: 3, d: 3 });
    const result = recruitmentBalanceMultipliers(world, ["a", "b", "c", "d"]);
    for (const [, mult] of result) {
      expect(mult).toBeCloseTo(1, 1);
    }
  });

  it("returns 1.0 for single heya in world (mean = own count)", () => {
    const world = worldWithStables({ solo: 5 });
    const result = recruitmentBalanceMultipliers(world, ["solo"]);
    expect(result.get("solo")).toBeCloseTo(1, 1);
  });

  it("respects min/max bounds in batch", () => {
    const world = worldWithStables({ mega: 50, tiny: 0, mid: 5 });
    const result = recruitmentBalanceMultipliers(world, ["mega", "tiny"]);
    expect(result.get("mega")!).toBeGreaterThanOrEqual(0.4);
    expect(result.get("tiny")!).toBeLessThanOrEqual(1.8);
  });
});
