import { describe, it, expect } from "vitest";
import {
  mapIdsToEntities,
  mapIdsToRikishi,
  mapIdsToHeya,
  filterEntities,
  getEntitiesByIds,
  groupBy,
  countBy,
} from "@/engine/utils/collectionOperations";
import { makeMockWorld, makeMockHeya, mockRikishi } from "../utils";

describe("mapIdsToEntities", () => {
  it("returns entities for all valid IDs", () => {
    const map = new Map([
      ["a", { id: "a", name: "Alpha" }],
      ["b", { id: "b", name: "Beta" }],
      ["c", { id: "c", name: "Gamma" }],
    ]);
    const result = mapIdsToEntities(["a", "b", "c"], map);
    expect(result).toHaveLength(3);
    expect(result[0].name).toBe("Alpha");
    expect(result[1].name).toBe("Beta");
    expect(result[2].name).toBe("Gamma");
  });

  it("filters out undefined entries for missing IDs", () => {
    const map = new Map([["a", { id: "a", name: "Alpha" }]]);
    const result = mapIdsToEntities(["a", "missing", "b"], map);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Alpha");
  });

  it("preserves order of input IDs", () => {
    const map = new Map([
      ["a", { id: "a", val: 1 }],
      ["b", { id: "b", val: 2 }],
      ["c", { id: "c", val: 3 }],
    ]);
    const result = mapIdsToEntities(["c", "a", "b"], map);
    expect(result.map((e) => e.val)).toEqual([3, 1, 2]);
  });

  it("returns empty array for empty input", () => {
    const map = new Map([["a", { id: "a" }]]);
    expect(mapIdsToEntities([], map)).toEqual([]);
  });

  it("returns empty array when all IDs are missing", () => {
    const map = new Map([["a", { id: "a" }]]);
    expect(mapIdsToEntities(["x", "y", "z"], map)).toEqual([]);
  });

  it("handles mixed valid and invalid IDs", () => {
    const map = new Map([
      ["a", { id: "a", val: 1 }],
      ["c", { id: "c", val: 3 }],
    ]);
    const result = mapIdsToEntities(["a", "b", "c"], map);
    expect(result).toHaveLength(2);
    expect(result.map((e) => e.val)).toEqual([1, 3]);
  });

  it("works with Map<string, object>", () => {
    const map = new Map<string, { count: number }>([
      ["x", { count: 10 }],
      ["y", { count: 20 }],
    ]);
    const result = mapIdsToEntities(["x", "y"], map);
    expect(result).toHaveLength(2);
    expect(result[0].count).toBe(10);
  });
});

describe("mapIdsToRikishi", () => {
  it("maps rikishi IDs from WorldState", () => {
    const world = makeMockWorld();
    const r1 = mockRikishi("r1");
    const r2 = mockRikishi("r2");
    world.rikishi.set("r1", r1);
    world.rikishi.set("r2", r2);
    const result = mapIdsToRikishi(world, ["r1", "r2", "missing"]);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("r1");
    expect(result[1].id).toBe("r2");
  });
});

describe("mapIdsToHeya", () => {
  it("maps heya IDs from WorldState", () => {
    const world = makeMockWorld();
    const h1 = makeMockHeya("h1");
    const h2 = makeMockHeya("h2");
    world.heyas.set("h1", h1);
    world.heyas.set("h2", h2);
    const result = mapIdsToHeya(world, ["h1", "h2"]);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("h1");
  });
});

describe("filterEntities", () => {
  it("filters entities by predicate", () => {
    const map = new Map([
      ["a", { val: 5 }],
      ["b", { val: 10 }],
      ["c", { val: 15 }],
    ]);
    const result = filterEntities(map, (e) => e.val > 8);
    expect(result).toHaveLength(2);
    expect(result.map((e) => e.val)).toEqual([10, 15]);
  });

  it("returns empty array when nothing matches", () => {
    const map = new Map([["a", { val: 1 }]]);
    expect(filterEntities(map, (e) => e.val > 100)).toEqual([]);
  });
});

describe("getEntitiesByIds", () => {
  it("returns entities including undefined for missing", () => {
    const map = new Map([["a", { id: "a" }]]);
    const result = getEntitiesByIds(["a", "missing"], map);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ id: "a" });
    expect(result[1]).toBeUndefined();
  });
});

describe("groupBy", () => {
  it("groups entities by key", () => {
    const items = [
      { type: "x", val: 1 },
      { type: "y", val: 2 },
      { type: "x", val: 3 },
    ];
    const groups = groupBy(items, (e) => e.type);
    expect(groups.get("x")).toHaveLength(2);
    expect(groups.get("y")).toHaveLength(1);
  });
});

describe("countBy", () => {
  it("counts entities by key", () => {
    const items = [{ type: "x" }, { type: "y" }, { type: "x" }, { type: "x" }];
    const counts = countBy(items, (e) => e.type);
    expect(counts.get("x")).toBe(3);
    expect(counts.get("y")).toBe(1);
  });
});
