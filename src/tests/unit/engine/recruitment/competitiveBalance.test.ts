import { describe, it, expect } from "vitest";
import { recruitmentBalanceMultiplier } from "@/engine/systems/generation/competitiveBalance";
import { makeMockWorld, makeMockHeya, mockRikishi } from "../utils";
import type { WorldState } from "@/engine/types/world";

function worldWithStables(spec: Record<string, number>): WorldState {
  // spec: heyaId -> number of SEKITORI (makuuchi + juryo) wrestlers in that stable.
  // This helper creates them all as makuuchi for simplicity; the juryo path is
  // exercised separately in the "counts juryo wrestlers" test below.
  const heyas = new Map();
  const rikishi = new Map();
  for (const [heyaId, sekitoriCount] of Object.entries(spec)) {
    const ids: string[] = [];
    for (let i = 0; i < sekitoriCount; i++) {
      const r = mockRikishi(`${heyaId}-s${i}`, { heyaId, division: "makuuchi", rank: "maegashira" });
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
    const world = worldWithStables({ a: 3, b: 3, c: 3 });
    expect(recruitmentBalanceMultiplier(world, "a")).toBeCloseTo(1, 1);
  });

  it("is bounded so it never zeroes or explodes a bid", () => {
    const world = worldWithStables({ mega: 30, empty: 0 });
    expect(recruitmentBalanceMultiplier(world, "mega")).toBeGreaterThanOrEqual(0.4);
    expect(recruitmentBalanceMultiplier(world, "empty")).toBeLessThanOrEqual(1.8);
  });

  it("counts juryo wrestlers as sekitori (not just makuuchi)", () => {
    const heyas = new Map();
    const rikishi = new Map();
    const ids: string[] = [];
    for (let i = 0; i < 6; i++) {
      const r = mockRikishi(`jstrong-s${i}`, { heyaId: "jstrong", division: "juryo", rank: "juryo" });
      rikishi.set(r.id, r); ids.push(r.id);
    }
    heyas.set("jstrong", makeMockHeya("jstrong", { rikishiIds: ids }));
    heyas.set("jweak", makeMockHeya("jweak", { rikishiIds: [] }));
    const world = makeMockWorld({ heyas, rikishi });
    expect(recruitmentBalanceMultiplier(world, "jstrong")).toBeLessThan(1);
    expect(recruitmentBalanceMultiplier(world, "jweak")).toBeGreaterThan(1);
  });
});
