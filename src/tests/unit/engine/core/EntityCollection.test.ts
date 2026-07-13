import { describe, it, expect } from "vitest";
import { EntityCollection } from "@/engine/core/EntityCollection";
import { mockRikishi } from "../utils";
import type { WorldState } from "@/engine/types/world";

describe("EntityCollection", () => {
  const activeRikishi = mockRikishi("r1", { heyaId: "h1", isRetired: false } as any);
  const activeRikishi2 = mockRikishi("r2", { heyaId: "h2", isRetired: false } as any);
  const retiredRikishi = mockRikishi("r3", { heyaId: "h1", isRetired: true } as any);

  const mockHeya1 = { id: "h1", name: "Heya 1" } as any;
  const mockHeya2 = { id: "h2", name: "Heya 2" } as any;

  const mockWorld = {
    rikishi: new Map([
      ["r2", activeRikishi2],
      ["r1", activeRikishi],
      ["r3", retiredRikishi],
    ]),
    heyas: new Map([
      ["h2", mockHeya2],
      ["h1", mockHeya1],
    ]),
  } as unknown as WorldState;

  describe("getRikishi", () => {
    it("should return active rikishi sorted by id by default", () => {
      const result = EntityCollection.getRikishi(mockWorld);
      expect(result).toHaveLength(2);
      // r1 should come before r2 because of stableSort by id
      expect(result[0].id).toBe("r1");
      expect(result[1].id).toBe("r2");
    });

    it("should include retired rikishi if specified", () => {
      const result = EntityCollection.getRikishi(mockWorld, { includeRetired: true });
      expect(result).toHaveLength(3);
      expect(result.map((r) => r.id)).toEqual(["r1", "r2", "r3"]);
    });

    it("should filter by heyaId if specified", () => {
      const result = EntityCollection.getRikishi(mockWorld, { heyaId: "h1", includeRetired: true });
      expect(result).toHaveLength(2);
      expect(result.map((r) => r.id)).toEqual(["r1", "r3"]);
    });
  });

  describe("getActiveRikishi", () => {
    it("should return only active rikishi sorted by id", () => {
      const result = EntityCollection.getActiveRikishi(mockWorld);
      expect(result).toHaveLength(2);
      expect(result.map((r) => r.id)).toEqual(["r1", "r2"]);
    });
  });

  describe("getHeyaRoster", () => {
    it("should return only active rikishi for a specific heya", () => {
      const result = EntityCollection.getHeyaRoster(mockWorld, "h1");
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("r1");
    });
  });

  describe("getHeyas", () => {
    it("should return heyas sorted by id", () => {
      const result = EntityCollection.getHeyas(mockWorld);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("h1");
      expect(result[1].id).toBe("h2");
    });
  });

  describe("getHeya", () => {
    it("should return specific heya by id", () => {
      const result = EntityCollection.getHeya(mockWorld, "h1");
      expect(result).toEqual(mockHeya1);
    });

    it("should return undefined if heya not found", () => {
      const result = EntityCollection.getHeya(mockWorld, "h3");
      expect(result).toBeUndefined();
    });
  });

  describe("getRikishiById", () => {
    it("should return specific rikishi by id", () => {
      const result = EntityCollection.getRikishiById(mockWorld, "r2");
      expect(result).toEqual(activeRikishi2);
    });

    it("should return undefined if rikishi not found", () => {
      const result = EntityCollection.getRikishiById(mockWorld, "r4");
      expect(result).toBeUndefined();
    });
  });

  describe("asMap option removal", () => {
    it("getRikishi always returns an array, never a Map", () => {
      const result = EntityCollection.getRikishi(mockWorld);
      expect(Array.isArray(result)).toBe(true);
    });

    it("getRikishi with includeRetired always returns an array", () => {
      const result = EntityCollection.getRikishi(mockWorld, { includeRetired: true });
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
