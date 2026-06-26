import { describe, it, expect } from "vitest";
import {
  recruitmentBalanceMultiplier,
  recruitmentBalanceMultipliers,
} from "@/engine/systems/generation/competitiveBalance";
import { makeMockWorld, makeMockHeya, mockRikishi } from "../utils";
import type { WorldState } from "@/engine/types/world";
import type { Id } from "@/engine/types/common";

function worldWithStables(spec: Record<string, number>): WorldState {
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

describe("recruitmentBalanceMultipliers", () => {
  it("returns a Map with the same values as individual recruitmentBalanceMultiplier calls", () => {
    const world = worldWithStables({ strong: 8, mid: 4, weak: 0 });
    const ids: Id[] = ["strong", "mid", "weak"];
    const batch = recruitmentBalanceMultipliers(world, ids);

    for (const id of ids) {
      expect(batch.get(id)).toBeCloseTo(recruitmentBalanceMultiplier(world, id), 10);
    }
  });

  it("computes the mean over ALL heyas in the world, not just the target subset", () => {
    // 5 heyas in the world, but we only request multipliers for 2 of them.
    // The mean should be over all 5.
    const world = worldWithStables({ a: 10, b: 0, c: 0, d: 0, e: 0 });
    const batch = recruitmentBalanceMultipliers(world, ["a", "b"]);

    // Mean over all 5 = (10+0+0+0+0)/5 = 2
    // a: 1 - (10-2)*0.12 = 1 - 0.96 = 0.04 → clamped to 0.4
    // b: 1 - (0-2)*0.12 = 1 + 0.24 = 1.24
    // If the mean were only over the 2 requested heyas: mean = 5
    //   a: 1 - (10-5)*0.12 = 0.4
    //   b: 1 - (0-5)*0.12 = 1.6
    // These differ, so we can distinguish.
    expect(batch.get("a")).toBeCloseTo(0.4, 5);
    expect(batch.get("b")).toBeCloseTo(1.24, 5);
  });

  it("returns empty Map for empty heyaIds array", () => {
    const world = worldWithStables({ a: 3, b: 3 });
    const batch = recruitmentBalanceMultipliers(world, []);
    expect(batch.size).toBe(0);
  });

  it("returns Map with single entry for one heyaId", () => {
    const world = worldWithStables({ a: 3, b: 3, c: 3 });
    const batch = recruitmentBalanceMultipliers(world, ["a"]);
    expect(batch.size).toBe(1);
    expect(batch.get("a")).toBeCloseTo(1, 1);
  });

  it("preserves min/max bounds for extreme cases", () => {
    const world = worldWithStables({ mega: 30, empty: 0 });
    const batch = recruitmentBalanceMultipliers(world, ["mega", "empty"]);
    expect(batch.get("mega")!).toBeGreaterThanOrEqual(0.4);
    expect(batch.get("empty")!).toBeLessThanOrEqual(1.8);
  });

  it("returns 1 for all requested heyas when world has no heyas", () => {
    const world = makeMockWorld({});
    const batch = recruitmentBalanceMultipliers(world, ["a", "b"]);
    expect(batch.get("a")).toBe(1);
    expect(batch.get("b")).toBe(1);
  });
});
