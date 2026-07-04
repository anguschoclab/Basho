import { describe, it, expect } from "vitest";
import {
  getHeya,
  getHeyaOrThrow,
  getRikishi,
  getRikishiOrThrow,
  getHeyaRikishi,
  getActiveRikishi,
  getAllActiveRikishi,
} from "@/engine/utils/entityAccess";
import { makeMockWorld, makeMockHeya, mockRikishi } from "../utils";
import type { WorldState } from "@/engine/types/world";

// ── getHeya ────────────────────────────────────────────────────────────────

describe("getHeya", () => {
  it("returns Heya when ID exists in heyas map", () => {
    const h1 = makeMockHeya("h1");
    const world = makeMockWorld({ heyas: new Map([["h1", h1]]) });
    expect(getHeya(world, "h1")).toBe(h1);
  });

  it("returns undefined when ID missing from heyas map", () => {
    const world = makeMockWorld({ heyas: new Map([["h1", makeMockHeya("h1")]]) });
    expect(getHeya(world, "ghost")).toBeUndefined();
  });

  it("returns undefined when heyas map is empty", () => {
    const world = makeMockWorld({ heyas: new Map() });
    expect(getHeya(world, "h1")).toBeUndefined();
  });

  it("returns undefined for falsy id (empty string)", () => {
    const world = makeMockWorld({ heyas: new Map([["h1", makeMockHeya("h1")]]) });
    expect(getHeya(world, "")).toBeUndefined();
  });

  it("returns the same object reference stored in the map", () => {
    const h1 = makeMockHeya("h1", { name: "Test" });
    const world = makeMockWorld({ heyas: new Map([["h1", h1]]) });
    const result = getHeya(world, "h1");
    expect(result).toBe(h1);
    expect(result?.name).toBe("Test");
  });

  it("does not require activeRikishiIds or other world fields", () => {
    const h1 = makeMockHeya("h1");
    const world = makeMockWorld({ heyas: new Map([["h1", h1]]) });
    // Clear rikishi/activeRikishiIds to confirm getHeya only touches heyas
    world.rikishi.clear();
    world.activeRikishiIds.clear();
    expect(getHeya(world, "h1")).toBe(h1);
  });
});

// ── getHeyaOrThrow ─────────────────────────────────────────────────────────

describe("getHeyaOrThrow", () => {
  it("returns Heya when ID exists", () => {
    const h1 = makeMockHeya("h1");
    const world = makeMockWorld({ heyas: new Map([["h1", h1]]) });
    expect(getHeyaOrThrow(world, "h1")).toBe(h1);
  });

  it("throws Error with id interpolated in message when missing", () => {
    const world = makeMockWorld({ heyas: new Map() });
    expect(() => getHeyaOrThrow(world, "ghost")).toThrow(/Heya with id ghost not found/);
  });

  it("throws on empty heyas map", () => {
    const world = makeMockWorld({ heyas: new Map() });
    expect(() => getHeyaOrThrow(world, "h1")).toThrow();
  });

  it("throws on falsy id (empty string)", () => {
    const world = makeMockWorld({ heyas: new Map([["h1", makeMockHeya("h1")]]) });
    expect(() => getHeyaOrThrow(world, "")).toThrow(/Heya with id  not found/);
  });

  it("thrown value is an Error instance", () => {
    const world = makeMockWorld({ heyas: new Map() });
    let thrown: unknown;
    try {
      getHeyaOrThrow(world, "ghost");
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(Error);
  });

  it("returns the correct Heya when multiple heyas present", () => {
    const h1 = makeMockHeya("h1", { name: "Alpha" });
    const h2 = makeMockHeya("h2", { name: "Beta" });
    const h3 = makeMockHeya("h3", { name: "Gamma" });
    const world = makeMockWorld({
      heyas: new Map([
        ["h1", h1],
        ["h2", h2],
        ["h3", h3],
      ]),
    });
    expect(getHeyaOrThrow(world, "h2")).toBe(h2);
    expect(getHeyaOrThrow(world, "h2").name).toBe("Beta");
  });
});

// ── getRikishi ─────────────────────────────────────────────────────────────

describe("getRikishi", () => {
  it("returns Rikishi when ID exists in rikishi map", () => {
    const r1 = mockRikishi("r1");
    const world = makeMockWorld({ rikishi: new Map([["r1", r1]]) });
    expect(getRikishi(world, "r1")).toBe(r1);
  });

  it("returns undefined when ID missing from rikishi map", () => {
    const world = makeMockWorld({ rikishi: new Map([["r1", mockRikishi("r1")]]) });
    expect(getRikishi(world, "ghost")).toBeUndefined();
  });

  it("returns undefined when rikishi map is empty", () => {
    const world = makeMockWorld({ rikishi: new Map() });
    expect(getRikishi(world, "r1")).toBeUndefined();
  });

  it("returns undefined for falsy id (empty string)", () => {
    const world = makeMockWorld({ rikishi: new Map([["r1", mockRikishi("r1")]]) });
    expect(getRikishi(world, "")).toBeUndefined();
  });

  it("returns the same object reference stored in the map", () => {
    const r1 = mockRikishi("r1", { shikona: "TestRikishi" });
    const world = makeMockWorld({ rikishi: new Map([["r1", r1]]) });
    const result = getRikishi(world, "r1");
    expect(result).toBe(r1);
    expect(result?.shikona).toBe("TestRikishi");
  });

  it("returns retired rikishi (does not filter on isRetired)", () => {
    const r1 = mockRikishi("r1", { isRetired: true });
    const world = makeMockWorld({ rikishi: new Map([["r1", r1]]) });
    // getRikishi is a raw map lookup — it should return retired rikishi too
    expect(getRikishi(world, "r1")).toBe(r1);
    expect(getRikishi(world, "r1")?.isRetired).toBe(true);
  });
});

// ── getRikishiOrThrow ──────────────────────────────────────────────────────

describe("getRikishiOrThrow", () => {
  it("returns Rikishi when ID exists", () => {
    const r1 = mockRikishi("r1");
    const world = makeMockWorld({ rikishi: new Map([["r1", r1]]) });
    expect(getRikishiOrThrow(world, "r1")).toBe(r1);
  });

  it("throws Error with id interpolated in message when missing", () => {
    const world = makeMockWorld({ rikishi: new Map() });
    expect(() => getRikishiOrThrow(world, "ghost")).toThrow(/Rikishi with id ghost not found/);
  });

  it("throws on empty rikishi map", () => {
    const world = makeMockWorld({ rikishi: new Map() });
    expect(() => getRikishiOrThrow(world, "r1")).toThrow();
  });

  it("throws on falsy id (empty string)", () => {
    const world = makeMockWorld({ rikishi: new Map([["r1", mockRikishi("r1")]]) });
    expect(() => getRikishiOrThrow(world, "")).toThrow(/Rikishi with id  not found/);
  });

  it("thrown value is an Error instance", () => {
    const world = makeMockWorld({ rikishi: new Map() });
    let thrown: unknown;
    try {
      getRikishiOrThrow(world, "ghost");
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(Error);
  });

  it("returns the correct Rikishi when multiple present", () => {
    const r1 = mockRikishi("r1", { shikona: "Alpha" });
    const r2 = mockRikishi("r2", { shikona: "Beta" });
    const r3 = mockRikishi("r3", { shikona: "Gamma" });
    const world = makeMockWorld({
      rikishi: new Map([
        ["r1", r1],
        ["r2", r2],
        ["r3", r3],
      ]),
    });
    expect(getRikishiOrThrow(world, "r2")).toBe(r2);
    expect(getRikishiOrThrow(world, "r2").shikona).toBe("Beta");
  });
});

// ── getHeyaRikishi ─────────────────────────────────────────────────────────

describe("getHeyaRikishi", () => {
  it("returns all rikishi listed in heya.rikishiIds when all resolve", () => {
    const r1 = mockRikishi("r1");
    const r2 = mockRikishi("r2");
    const h1 = makeMockHeya("h1", { rikishiIds: ["r1", "r2"] });
    const world = makeMockWorld({
      heyas: new Map([["h1", h1]]),
      rikishi: new Map([
        ["r1", r1],
        ["r2", r2],
      ]),
    });
    const result = getHeyaRikishi(world, "h1");
    expect(result).toHaveLength(2);
    expect(result[0]).toBe(r1);
    expect(result[1]).toBe(r2);
  });

  it("returns [] when heyaId is missing from heyas map", () => {
    const world = makeMockWorld({ heyas: new Map() });
    expect(getHeyaRikishi(world, "ghost")).toEqual([]);
  });

  it("returns [] when heya.rikishiIds is undefined", () => {
    // makeMockHeya defaults rikishiIds to [], so override with undefined
    const h1 = makeMockHeya("h1");
    (h1 as Partial<{ rikishiIds: string[] }>).rikishiIds = undefined;
    const world = makeMockWorld({ heyas: new Map([["h1", h1]]) });
    expect(getHeyaRikishi(world, "h1")).toEqual([]);
  });

  it("returns [] when heya.rikishiIds is an empty array", () => {
    const h1 = makeMockHeya("h1", { rikishiIds: [] });
    const world = makeMockWorld({ heyas: new Map([["h1", h1]]) });
    expect(getHeyaRikishi(world, "h1")).toEqual([]);
  });

  it("filters out IDs that don't resolve to a rikishi in world.rikishi", () => {
    const r1 = mockRikishi("r1");
    const h1 = makeMockHeya("h1", { rikishiIds: ["r1", "ghost1", "ghost2"] });
    const world = makeMockWorld({
      heyas: new Map([["h1", h1]]),
      rikishi: new Map([["r1", r1]]),
    });
    const result = getHeyaRikishi(world, "h1");
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(r1);
  });

  it("preserves the order of heya.rikishiIds in the returned array", () => {
    const r1 = mockRikishi("r1");
    const r2 = mockRikishi("r2");
    const r3 = mockRikishi("r3");
    const h1 = makeMockHeya("h1", { rikishiIds: ["r3", "r1", "r2"] });
    const world = makeMockWorld({
      heyas: new Map([["h1", h1]]),
      rikishi: new Map([
        ["r1", r1],
        ["r2", r2],
        ["r3", r3],
      ]),
    });
    const result = getHeyaRikishi(world, "h1");
    expect(result.map((r) => r.id)).toEqual(["r3", "r1", "r2"]);
  });

  it("handles mixed resolved/missing IDs", () => {
    const r1 = mockRikishi("r1");
    const r3 = mockRikishi("r3");
    const h1 = makeMockHeya("h1", { rikishiIds: ["r1", "r2", "r3"] });
    const world = makeMockWorld({
      heyas: new Map([["h1", h1]]),
      rikishi: new Map([
        ["r1", r1],
        ["r3", r3],
      ]),
    });
    const result = getHeyaRikishi(world, "h1");
    expect(result).toHaveLength(2);
    expect(result[0]).toBe(r1);
    expect(result[1]).toBe(r3);
  });
});

// ── getActiveRikishi ───────────────────────────────────────────────────────

describe("getActiveRikishi", () => {
  it("returns all active rikishi when activeRikishiIds is populated and all resolve", () => {
    const r1 = mockRikishi("r1");
    const r2 = mockRikishi("r2");
    const world = makeMockWorld({
      rikishi: new Map([
        ["r1", r1],
        ["r2", r2],
      ]),
    });
    const result = getActiveRikishi(world);
    expect(result).toHaveLength(2);
    expect(result).toContain(r1);
    expect(result).toContain(r2);
  });

  it("returns [] when activeRikishiIds is an empty Set", () => {
    const world = makeMockWorld({ activeRikishiIds: new Set() });
    expect(getActiveRikishi(world)).toEqual([]);
  });

  it("returns [] when activeRikishiIds is undefined (defensive guard)", () => {
    const world = makeMockWorld();
    delete (world as Partial<WorldState>).activeRikishiIds;
    expect(getActiveRikishi(world)).toEqual([]);
  });

  it("skips IDs in activeRikishiIds that are missing from world.rikishi", () => {
    const r1 = mockRikishi("r1");
    const world = makeMockWorld({
      rikishi: new Map([["r1", r1]]),
      activeRikishiIds: new Set(["r1", "ghost1", "ghost2"]),
    });
    const result = getActiveRikishi(world);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(r1);
  });

  it("preserves iteration order of the Set", () => {
    const r1 = mockRikishi("r1");
    const r2 = mockRikishi("r2");
    const r3 = mockRikishi("r3");
    const world = makeMockWorld({
      rikishi: new Map([
        ["r1", r1],
        ["r2", r2],
        ["r3", r3],
      ]),
      activeRikishiIds: new Set(["r3", "r1", "r2"]),
    });
    const result = getActiveRikishi(world);
    expect(result.map((r) => r.id)).toEqual(["r3", "r1", "r2"]);
  });

  it("does not include retired rikishi that are in world.rikishi but not in activeRikishiIds", () => {
    // mockRikishi with isRetired: true is excluded from activeRikishiIds by the mock util
    const rActive = mockRikishi("rActive", { isRetired: false });
    const rRetired = mockRikishi("rRetired", { isRetired: true });
    const world = makeMockWorld({
      rikishi: new Map([
        ["rActive", rActive],
        ["rRetired", rRetired],
      ]),
    });
    const result = getActiveRikishi(world);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(rActive);
    expect(result).not.toContain(rRetired);
  });
});

// ── getAllActiveRikishi ────────────────────────────────────────────────────

describe("getAllActiveRikishi", () => {
  it("returns identical result to getActiveRikishi on a populated world", () => {
    const r1 = mockRikishi("r1");
    const r2 = mockRikishi("r2");
    const world = makeMockWorld({
      rikishi: new Map([
        ["r1", r1],
        ["r2", r2],
      ]),
    });
    expect(getAllActiveRikishi(world)).toEqual(getActiveRikishi(world));
  });

  it("returns [] on empty world", () => {
    const world = makeMockWorld({ activeRikishiIds: new Set() });
    expect(getAllActiveRikishi(world)).toEqual([]);
  });

  it("returns all active rikishi (same contents as getActiveRikishi)", () => {
    const r1 = mockRikishi("r1");
    const r2 = mockRikishi("r2");
    const r3 = mockRikishi("r3");
    const world = makeMockWorld({
      rikishi: new Map([
        ["r1", r1],
        ["r2", r2],
        ["r3", r3],
      ]),
    });
    const result = getAllActiveRikishi(world);
    expect(result).toHaveLength(3);
    expect(result).toContain(r1);
    expect(result).toContain(r2);
    expect(result).toContain(r3);
  });

  it("returns a fresh array on each call (not memoized)", () => {
    const r1 = mockRikishi("r1");
    const world = makeMockWorld({ rikishi: new Map([["r1", r1]]) });
    const result1 = getAllActiveRikishi(world);
    const result2 = getAllActiveRikishi(world);
    expect(result1).not.toBe(result2);
    expect(result1).toEqual(result2);
  });
});
