/**
 * entityAccess.test.ts
 *
 * Tests for entity access utility functions.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect } from "vitest";
import {
  getHeya,
  getHeyaOrThrow,
  getRikishi,
  getRikishiOrThrow,
  getHeyaRikishi,
  getActiveRikishi,
} from "../../../engine/utils/entityAccess";
import { createMockWorldState, createMockHeya, createMockRikishi } from "../../utils/testHelpers";

describe("entityAccess", () => {
  describe("getHeya", () => {
    it("should return heya when found", () => {
      const world = createMockWorldState() as any;
      const heya = createMockHeya({ id: "heya-1" });
      world.heyas.set("heya-1", heya);

      const result = getHeya(world, "heya-1");
      expect(result).toBe(heya);
    });

    it("should return undefined when not found", () => {
      const world = createMockWorldState() as any;
      const result = getHeya(world, "non-existent");
      expect(result).toBeUndefined();
    });
  });

  describe("getHeyaOrThrow", () => {
    it("should return heya when found", () => {
      const world = createMockWorldState() as any;
      const heya = createMockHeya({ id: "heya-1" });
      world.heyas.set("heya-1", heya);

      const result = getHeyaOrThrow(world, "heya-1");
      expect(result).toBe(heya);
    });

    it("should throw when not found", () => {
      const world = createMockWorldState() as any;
      expect(() => getHeyaOrThrow(world, "non-existent")).toThrow();
    });
  });

  describe("getRikishi", () => {
    it("should return rikishi when found", () => {
      const world = createMockWorldState() as any;
      const rikishi = createMockRikishi({ id: "rikishi-1" });
      world.rikishi.set("rikishi-1", rikishi);

      const result = getRikishi(world, "rikishi-1");
      expect(result).toBe(rikishi);
    });

    it("should return undefined when not found", () => {
      const world = createMockWorldState() as any;
      const result = getRikishi(world, "non-existent");
      expect(result).toBeUndefined();
    });
  });

  describe("getRikishiOrThrow", () => {
    it("should return rikishi when found", () => {
      const world = createMockWorldState() as any;
      const rikishi = createMockRikishi({ id: "rikishi-1" });
      world.rikishi.set("rikishi-1", rikishi);

      const result = getRikishiOrThrow(world, "rikishi-1");
      expect(result).toBe(rikishi);
    });

    it("should throw when not found", () => {
      const world = createMockWorldState() as any;
      expect(() => getRikishiOrThrow(world, "non-existent")).toThrow();
    });
  });

  describe("getHeyaRikishi", () => {
    it("should return all rikishi in a heya", () => {
      const world = createMockWorldState() as any;
      const heya = createMockHeya({ id: "heya-1", rikishiIds: ["rikishi-1", "rikishi-2"] });
      const rikishi1 = createMockRikishi({ id: "rikishi-1", heyaId: "heya-1" });
      const rikishi2 = createMockRikishi({ id: "rikishi-2", heyaId: "heya-1" });

      world.heyas.set("heya-1", heya);
      world.rikishi.set("rikishi-1", rikishi1);
      world.rikishi.set("rikishi-2", rikishi2);

      const result = getHeyaRikishi(world, "heya-1");
      expect(result).toHaveLength(2);
      expect(result).toContain(rikishi1);
      expect(result).toContain(rikishi2);
    });

    it("should return empty array when heya has no rikishi", () => {
      const world = createMockWorldState() as any;
      const heya = createMockHeya({ id: "heya-1", rikishiIds: [] });
      world.heyas.set("heya-1", heya);

      const result = getHeyaRikishi(world, "heya-1");
      expect(result).toHaveLength(0);
    });
  });

  describe("getActiveRikishi", () => {
    it("should return non-retired rikishi", () => {
      const world = createMockWorldState() as any;
      const activeRikishi = createMockRikishi({ id: "rikishi-1", isRetired: false });
      const retiredRikishi = createMockRikishi({ id: "rikishi-2", isRetired: true });

      world.rikishi.set("rikishi-1", activeRikishi);
      world.rikishi.set("rikishi-2", retiredRikishi);

      const result = getActiveRikishi(world);
      expect(result).toHaveLength(1);
      expect(result).toContain(activeRikishi);
      expect(result).not.toContain(retiredRikishi);
    });
  });
});
