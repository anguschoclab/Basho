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

  describe("indexBashoResult — multi-prize entry tracking", () => {
    it("updates first entry when rikishi has yusho AND ginoSho", () => {
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
          standings: new Map([["r1", { wins: 14, losses: 1 }]]),
          isActive: false,
        } as WorldState["currentBasho"],
      });

      const result = makeMockBashoResult({ yusho: "r1", ginoSho: "r1" });
      indexBashoResult(world, result);

      const idx = world.historyIndex as HistoryIndex;
      const entries = idx.rikishi["r1"];
      expect(entries).toBeTruthy();
      expect(entries?.length).toBe(2);

      const yushoEntry = entries?.find((e) => e.yusho === true);
      const ginoShoEntry = entries?.find((e) => e.ginoSho === true);
      expect(yushoEntry).toBeTruthy();
      expect(ginoShoEntry).toBeTruthy();

      // Standings should have updated the FIRST entry (yusho), not the second (ginoSho)
      expect(yushoEntry?.wins).toBe(14);
      expect(yushoEntry?.losses).toBe(1);
      expect(ginoShoEntry?.wins).toBeUndefined();
      expect(ginoShoEntry?.losses).toBeUndefined();
    });

    it("updates first entry when rikishi has yusho AND shukunsho", () => {
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
          standings: new Map([["r1", { wins: 13, losses: 2 }]]),
          isActive: false,
        } as WorldState["currentBasho"],
      });

      const result = makeMockBashoResult({ yusho: "r1", shukunsho: "r1" });
      indexBashoResult(world, result);

      const idx = world.historyIndex as HistoryIndex;
      const entries = idx.rikishi["r1"];
      expect(entries?.length).toBe(2);

      const yushoEntry = entries?.find((e) => e.yusho === true);
      const shukunshoEntry = entries?.find((e) => e.shukunsho === true);
      expect(yushoEntry?.wins).toBe(13);
      expect(yushoEntry?.losses).toBe(2);
      expect(shukunshoEntry?.wins).toBeUndefined();
    });

    it("creates new entry for standings-only rikishi (no prizes)", () => {
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
          standings: new Map([["r1", { wins: 7, losses: 8 }]]),
          isActive: false,
        } as WorldState["currentBasho"],
      });

      const result = makeMockBashoResult();
      indexBashoResult(world, result);

      const idx = world.historyIndex as HistoryIndex;
      const entries = idx.rikishi["r1"];
      expect(entries).toBeTruthy();
      expect(entries?.length).toBe(1);
      expect(entries?.[0]?.wins).toBe(7);
      expect(entries?.[0]?.losses).toBe(8);
      expect(entries?.[0]?.yusho).toBeUndefined();
    });

    it("handles large standings map without regression", () => {
      const rikishiMap = new Map();
      const standingsEntries: [string, { wins: number; losses: number }][] = [];
      for (let i = 0; i < 100; i++) {
        const rid = `r${i}`;
        rikishiMap.set(rid, mockRikishi(rid));
        standingsEntries.push([rid, { wins: i % 15, losses: 15 - (i % 15) }]);
      }

      const world = makeMockWorld({
        rikishi: rikishiMap,
        currentBasho: {
          id: "test-basho",
          year: 2025,
          bashoNumber: 1,
          bashoName: "hatsu",
          day: 15,
          matches: [],
          standings: new Map(standingsEntries),
          isActive: false,
        } as WorldState["currentBasho"],
      });

      const result = makeMockBashoResult();
      indexBashoResult(world, result);

      const idx = world.historyIndex as HistoryIndex;
      for (let i = 0; i < 100; i++) {
        const rid = `r${i}`;
        const entries = idx.rikishi[rid];
        expect(entries).toBeTruthy();
        expect(entries?.length).toBe(1);
        expect(entries?.[0]?.wins).toBe(i % 15);
        expect(entries?.[0]?.losses).toBe(15 - (i % 15));
      }
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
