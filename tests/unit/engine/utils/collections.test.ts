import { describe, it, expect } from "vitest";
import { toIdMap, toKeyedMap } from "@/engine/utils/collections";

// ---------------------------------------------------------------------------
// toIdMap
// ---------------------------------------------------------------------------

describe("toIdMap", () => {
  it("keys items by their id field", () => {
    const items = [
      { id: "a", value: 1 },
      { id: "b", value: 2 },
    ];
    const map = toIdMap(items);

    expect(map.size).toBe(2);
    expect(map.get("a")).toBe(items[0]);
    expect(map.get("b")).toBe(items[1]);
  });

  it("preserves object references (no copies)", () => {
    const item = { id: "x", nested: { n: 1 } };
    expect(toIdMap([item]).get("x")).toBe(item);
  });

  it("returns an empty map for an empty array", () => {
    expect(toIdMap([]).size).toBe(0);
  });

  it("last write wins on duplicate ids (new Map semantics)", () => {
    const first = { id: "dup", tag: "first" };
    const last = { id: "dup", tag: "last" };
    expect(toIdMap([first, last]).get("dup")).toBe(last);
  });

  it("accepts readonly arrays", () => {
    const items = [{ id: "r" }] as const;
    expect(toIdMap(items).get("r")).toBe(items[0]);
  });
});

// ---------------------------------------------------------------------------
// toKeyedMap
// ---------------------------------------------------------------------------

describe("toKeyedMap", () => {
  it("keys items by a custom selector", () => {
    const entries = [
      { rikishiId: "r1", rank: 1 },
      { rikishiId: "r2", rank: 2 },
    ];
    const map = toKeyedMap(entries, (e) => e.rikishiId);

    expect(map.get("r1")?.rank).toBe(1);
    expect(map.get("r2")?.rank).toBe(2);
  });

  it("defaults the value to the item itself", () => {
    const item = { key: "k", payload: 42 };
    const map = toKeyedMap([item], (i) => i.key);
    expect(map.get("k")).toBe(item);
  });

  it("transforms values via valueOf", () => {
    const pool = [
      { id: "a", heyaId: "h1" },
      { id: "b", heyaId: "h2" },
    ];
    const map = toKeyedMap(
      pool,
      (r) => r.id,
      (r) => r.heyaId
    );

    expect(map.get("a")).toBe("h1");
    expect(map.get("b")).toBe("h2");
  });

  it("exposes the item index to selectors", () => {
    const wins = [10, 20];
    const pool = [{ id: "a" }, { id: "b" }];
    const map = toKeyedMap(
      pool,
      (r) => r.id,
      (_r, i) => wins[i]
    );

    expect(map.get("a")).toBe(10);
    expect(map.get("b")).toBe(20);
  });

  it("last write wins on duplicate keys", () => {
    const items = [
      { k: "same", v: 1 },
      { k: "same", v: 2 },
    ];
    const map = toKeyedMap(
      items,
      (i) => i.k,
      (i) => i.v
    );
    expect(map.get("same")).toBe(2);
  });

  it("supports non-string keys", () => {
    const items = [{ n: 1 }, { n: 2 }];
    const map = toKeyedMap(items, (i) => i.n);
    expect(map.get(1)).toBe(items[0]);
  });
});
