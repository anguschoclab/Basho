import { describe, it, expect } from "vitest";
import {
  indexBashoResult,
  createEmptyHistoryIndex,
  makeBashoKey,
  type HistoryIndex,
} from "@/engine/historyIndex";
import { makeMockWorld, mockRikishi } from "./utils";
import type { WorldState } from "@/engine/types/world";
import type { BashoResult } from "@/engine/types/basho";

function makeMockBashoResult(overrides: Partial<BashoResult> = {}): BashoResult {
  return {
    year: 2025,
    bashoNumber: 1,
    bashoName: "hatsu",
    yusho: undefined,
    junYusho: [],
    ginoSho: undefined,
    kantosho: undefined,
    shukunsho: undefined,
    nextBanzuke: undefined,
    ...overrides,
  } as BashoResult;
}

describe("historyIndex", () => {
  describe("indexBashoResult", () => {
    it("creates history index entry for a basho result", () => {
      const world = makeMockWorld();
      const result = makeMockBashoResult();
      indexBashoResult(world, result);

      const idx = world.historyIndex as HistoryIndex;
      const key = makeBashoKey(2025, 1);
      expect(idx.basho[key]).toBeTruthy();
      expect(idx.basho[key]?.year).toBe(2025);
      expect(idx.basho[key]?.bashoName).toBe("hatsu");
    });

    it("does not duplicate entry for same basho key", () => {
      const world = makeMockWorld();
      const result = makeMockBashoResult();

      indexBashoResult(world, result);
      indexBashoResult(world, result);

      const idx = world.historyIndex as HistoryIndex;
      const key = makeBashoKey(2025, 1);
      expect(idx.bashoKeys.filter((k) => k === key).length).toBe(1);
    });

    it("processes Map-based standings correctly", () => {
      const r1 = mockRikishi("r1");
      const r2 = mockRikishi("r2");
      const world = makeMockWorld({
        rikishi: new Map([
          ["r1", r1],
          ["r2", r2],
        ]),
        currentBasho: {
          id: "test-basho",
          year: 2025,
          bashoNumber: 1,
          bashoName: "hatsu",
          day: 15,
          matches: [],
          standings: new Map([
            ["r1", { wins: 10, losses: 5 }],
            ["r2", { wins: 8, losses: 7 }],
          ]),
          isActive: false,
        } as WorldState["currentBasho"],
      });

      const result = makeMockBashoResult();
      indexBashoResult(world, result);

      const idx = world.historyIndex as HistoryIndex;
      const r1Entries = idx.rikishi["r1"];
      expect(r1Entries).toBeTruthy();
      expect(r1Entries?.some((e) => e.wins === 10 && e.losses === 5)).toBe(true);

      const r2Entries = idx.rikishi["r2"];
      expect(r2Entries).toBeTruthy();
      expect(r2Entries?.some((e) => e.wins === 8 && e.losses === 7)).toBe(true);
    });

    it("processes Record-based standings correctly (Object.entries path)", () => {
      const r1 = mockRikishi("r1");
      const world = makeMockWorld({
        rikishi: new Map([["r1", r1]]),
        currentBasho: {
          id: "test-basho",
          year: 2025,
          bashoNumber: 1,
          bashoName: "hatsu",
          day: 15,
          matches: [],
          standings: {
            r1: { wins: 12, losses: 3 },
          } as unknown as Map<string, { wins: number; losses: number }>,
          isActive: false,
        } as WorldState["currentBasho"],
      });

      const result = makeMockBashoResult();
      indexBashoResult(world, result);

      const idx = world.historyIndex as HistoryIndex;
      const r1Entries = idx.rikishi["r1"];
      expect(r1Entries).toBeTruthy();
      expect(r1Entries?.some((e) => e.wins === 12 && e.losses === 3)).toBe(true);
    });

    it("updates existing rikishi entry wins/losses from standings", () => {
      const r1 = mockRikishi("r1");
      const world = makeMockWorld({
        rikishi: new Map([["r1", r1]]),
        currentBasho: {
          id: "test-basho",
          year: 2025,
          bashoNumber: 1,
          bashoName: "hatsu",
          day: 15,
          matches: [],
          standings: new Map([["r1", { wins: 11, losses: 4 }]]),
          isActive: false,
        } as WorldState["currentBasho"],
      });

      // First index with yusho to create an entry
      const result1 = makeMockBashoResult({ yusho: "r1" });
      indexBashoResult(world, result1);

      const idx = world.historyIndex as HistoryIndex;
      const key = makeBashoKey(2025, 1);
      const entry = idx.rikishi["r1"]?.find((e) => e.bashoKey === key);
      expect(entry).toBeTruthy();
      expect(entry?.yusho).toBe(true);
      // Standings should have updated wins/losses on the existing entry
      expect(entry?.wins).toBe(11);
      expect(entry?.losses).toBe(4);
    });

    it("handles empty standings map", () => {
      const world = makeMockWorld({
        currentBasho: {
          id: "test-basho",
          year: 2025,
          bashoNumber: 1,
          bashoName: "hatsu",
          day: 15,
          matches: [],
          standings: new Map(),
          isActive: false,
        } as WorldState["currentBasho"],
      });

      const result = makeMockBashoResult();
      indexBashoResult(world, result);

      const idx = world.historyIndex as HistoryIndex;
      const key = makeBashoKey(2025, 1);
      expect(idx.basho[key]).toBeTruthy();
    });

    it("handles undefined currentBasho (no standings)", () => {
      const world = makeMockWorld();
      const result = makeMockBashoResult({ yusho: "r1" });
      indexBashoResult(world, result);

      const idx = world.historyIndex as HistoryIndex;
      const key = makeBashoKey(2025, 1);
      expect(idx.basho[key]).toBeTruthy();
      expect(idx.rikishi["r1"]).toBeTruthy();
    });
  });

  describe("createEmptyHistoryIndex", () => {
    it("creates an index with version 1.0.0", () => {
      const idx = createEmptyHistoryIndex();
      expect(idx.version).toBe("1.0.0");
      expect(idx.bashoKeys).toEqual([]);
      expect(idx.basho).toEqual({});
      expect(idx.rikishi).toEqual({});
    });
  });
});
