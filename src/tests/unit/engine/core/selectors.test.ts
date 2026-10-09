import { describe, it, expect } from "vitest";
import {
  getActiveRikishi,
  getEligibleOpponents,
  getAvailableStables,
  getStableFinances,
} from "@/engine/selectors";
import { makeMockWorld, mockRikishi, makeMockHeya } from "../utils";
import type { Rikishi } from "@/engine/types/rikishi";

describe("selectors", () => {
  describe("getActiveRikishi", () => {
    it("should return empty array if no active rikishi", () => {
      const world = makeMockWorld();
      world.rikishi.clear();
      world.activeRikishiIds.clear();
      expect(getActiveRikishi(world)).toEqual([]);
    });

    it("should return active rikishi from world", () => {
      const r1 = mockRikishi("r1", { isRetired: false });
      const r2 = mockRikishi("r2", { isRetired: true });
      const world = makeMockWorld({
        rikishi: new Map([
          ["r1", r1],
          ["r2", r2],
        ]),
      });
      // The utils handles activeRikishiIds sync

      const result = getActiveRikishi(world);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("r1");
    });

    it("should return memoized result if dayIndexGlobal unchanged", () => {
      const r1 = mockRikishi("r1", { isRetired: false });
      const world = makeMockWorld({
        rikishi: new Map([["r1", r1]]),
        dayIndexGlobal: 0,
      });

      const result1 = getActiveRikishi(world);

      // Mutate internal state directly to bypass set wrapper to test memoization
      const r2 = mockRikishi("r2", { isRetired: false });
      world.activeRikishiIds.add("r2");
      world.rikishi.set("r2", r2);

      // Because dayIndexGlobal hasn't changed, memoization should return the first array reference
      const result2 = getActiveRikishi(world);
      expect(result2).toBe(result1);
      expect(result2).toHaveLength(1);

      // Change tick
      world.dayIndexGlobal = 1;
      const result3 = getActiveRikishi(world);
      expect(result3).not.toBe(result1);
      expect(result3).toHaveLength(2);
    });
  });

  describe("getEligibleOpponents", () => {
    it("should exclude self, injured, and same-heya rikishi", () => {
      const me = mockRikishi("me", { heyaId: "h1" });
      const oppEligible = mockRikishi("opp1", { heyaId: "h2", injured: false });
      const oppSameHeya = mockRikishi("opp2", { heyaId: "h1", injured: false });
      const oppInjured = mockRikishi("opp3", { heyaId: "h2", injured: true });

      const world = makeMockWorld({
        rikishi: new Map([
          ["me", me],
          ["opp1", oppEligible],
          ["opp2", oppSameHeya],
          ["opp3", oppInjured],
        ]),
      });

      const result = getEligibleOpponents(world, "me");
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("opp1");
    });

    it("should return empty if target rikishi not found", () => {
      const world = makeMockWorld();
      expect(getEligibleOpponents(world, "ghost")).toEqual([]);
    });
  });

  describe("getAvailableStables", () => {
    it("should return all stables and memoize", () => {
      const h1 = makeMockHeya("h1");
      const h2 = makeMockHeya("h2");
      const world = makeMockWorld({
        heyas: new Map([
          ["h1", h1],
          ["h2", h2],
        ]),
        dayIndexGlobal: 0,
      });

      const result1 = getAvailableStables(world);
      expect(result1).toHaveLength(2);

      world.heyas.set("h3", makeMockHeya("h3"));

      // Still returns 2 due to memoization
      const result2 = getAvailableStables(world);
      expect(result2).toBe(result1);

      // Change tick
      world.dayIndexGlobal = 1;
      expect(getAvailableStables(world)).toHaveLength(3);
    });
  });

  describe("getStableFinances", () => {
    it("should return stable funds", () => {
      const world = makeMockWorld({
        heyas: new Map([["h1", makeMockHeya("h1", { funds: 12345 })]]),
      });
      expect(getStableFinances(world, "h1")).toBe(12345);
    });

    it("should return 0 if stable not found", () => {
      expect(getStableFinances(makeMockWorld(), "nope")).toBe(0);
    });
  });
});
