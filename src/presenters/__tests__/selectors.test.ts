import { describe, it, expect } from "vitest";
import { selectKadobanRikishi } from "../selectors";
import type { WorldState } from "../../engine/types/world";
import type { Rikishi } from "../../engine/types/rikishi";
import { mockRikishi } from "../../engine/__tests__/utils";

describe("selectKadobanRikishi", () => {
  it("should return an empty array if world.ozekiKadoban is undefined", () => {
    const world = {
      ozekiKadoban: undefined,
      rikishi: new Map(),
    } as unknown as WorldState;

    const result = selectKadobanRikishi(world);
    expect(result).toEqual([]);
  });

  it("should return an empty array if world.ozekiKadoban is empty", () => {
    const world = {
      ozekiKadoban: {},
      rikishi: new Map(),
    } as unknown as WorldState;

    const result = selectKadobanRikishi(world);
    expect(result).toEqual([]);
  });

  it("should return Rikishi objects for each ID in ozekiKadoban", () => {
    const r1 = mockRikishi("r1", { rank: "ozeki" });
    const r2 = mockRikishi("r2", { rank: "ozeki" });
    const r3 = mockRikishi("r3", { rank: "ozeki" });

    const rikishiMap = new Map<string, Rikishi>();
    rikishiMap.set("r1", r1);
    rikishiMap.set("r2", r2);
    rikishiMap.set("r3", r3);

    const world = {
      ozekiKadoban: {
        r1: true,
        r3: true,
      },
      rikishi: rikishiMap,
    } as unknown as WorldState;

    const result = selectKadobanRikishi(world);
    expect(result).toHaveLength(2);
    expect(result).toContain(r1);
    expect(result).toContain(r3);
    expect(result).not.toContain(r2);
  });

  it("should skip IDs in ozekiKadoban that do not exist in world.rikishi", () => {
    const r1 = mockRikishi("r1", { rank: "ozeki" });

    const rikishiMap = new Map<string, Rikishi>();
    rikishiMap.set("r1", r1);

    const world = {
      ozekiKadoban: {
        r1: true,
        missing_id: true,
      },
      rikishi: rikishiMap,
    } as unknown as WorldState;

    const result = selectKadobanRikishi(world);
    expect(result).toHaveLength(1);
    expect(result).toContain(r1);
  });

  it("should memoize the result if the world object is the same", () => {
    const r1 = mockRikishi("r1", { rank: "ozeki" });

    const rikishiMap = new Map<string, Rikishi>();
    rikishiMap.set("r1", r1);

    const world = {
      ozekiKadoban: {
        r1: true,
      },
      rikishi: rikishiMap,
    } as unknown as WorldState;

    const result1 = selectKadobanRikishi(world);
    const result2 = selectKadobanRikishi(world);

    // Check strict equality to ensure it's the exact same array reference
    expect(result1).toBe(result2);
  });
});
