/**
 * Tests for the shared bout test helpers.
 * Verifies that boutTestHelpers produce valid objects compatible with engine types.
 */
import { describe, it, expect } from "vitest";
import {
  makeBoutResult,
  makeMinimalBoutResult,
  makeBoutWorld,
} from "@/tests/helpers/boutTestHelpers";
import { mockRikishi } from "@/tests/unit/engine/utils";
import { generateBoutNarrative } from "@/engine/bout/boutNarrative";
import { BardEngine } from "@/engine/bard/BardEngine";
import { beforeEach } from "vitest";
import type { BashoName } from "@/engine/types/basho";

describe("boutTestHelpers", () => {
  beforeEach(() => {
    BardEngine.resetCache();
  });

  describe("makeBoutResult", () => {
    it("returns a BoutResult with default values", () => {
      const result = makeBoutResult();
      expect(result.boutId).toBe("test-bout");
      expect(result.winner).toBe("east");
      expect(result.winnerRikishiId).toBe("r-east");
      expect(result.loserRikishiId).toBe("r-west");
      expect(result.kimarite).toBe("yorikiri");
      expect(result.duration).toBe(8.5);
      expect(result.log).toHaveLength(2);
      expect(result.log![0].phase).toBe("tachiai");
      expect(result.log![1].phase).toBe("finish");
    });

    it("applies overrides correctly", () => {
      const result = makeBoutResult({
        boutId: "custom-bout",
        winner: "west",
        kimarite: "oshidashi",
        duration: 12.3,
      });
      expect(result.boutId).toBe("custom-bout");
      expect(result.winner).toBe("west");
      expect(result.kimarite).toBe("oshidashi");
      expect(result.duration).toBe(12.3);
      // Non-overridden fields remain default
      expect(result.winnerRikishiId).toBe("r-east");
    });

    it("produces a result usable by generateBoutNarrative without errors", () => {
      const east = mockRikishi("r-east", { shikona: "Alpha", currentBashoWins: 5 });
      const west = mockRikishi("r-west", { shikona: "Beta", currentBashoWins: 2 });
      const world = makeBoutWorld(east, west);
      const result = makeBoutResult();
      expect(() => {
        generateBoutNarrative(result, east, west, "hatsu" as BashoName, 5, "test-seed", world);
      }).not.toThrow();
    });
  });

  describe("makeMinimalBoutResult", () => {
    it("returns a BoutResult with empty log", () => {
      const result = makeMinimalBoutResult();
      expect(result.boutId).toBe("test-bout");
      expect(result.log).toEqual([]);
      expect(result.duration).toBe(8.5);
    });

    it("applies overrides correctly", () => {
      const result = makeMinimalBoutResult({
        boutId: "minimal-custom",
        upset: true,
      });
      expect(result.boutId).toBe("minimal-custom");
      expect(result.upset).toBe(true);
      expect(result.log).toEqual([]);
    });

    it("produces a result usable by generateBoutNarrative without errors", () => {
      const east = mockRikishi("r-east", { shikona: "Alpha", currentBashoWins: 6 });
      const west = mockRikishi("r-west", { shikona: "Beta", currentBashoWins: 3 });
      const world = makeBoutWorld(east, west);
      const result = makeMinimalBoutResult();
      expect(() => {
        generateBoutNarrative(result, east, west, "hatsu" as BashoName, 7, "test-seed", world);
      }).not.toThrow();
    });
  });

  describe("makeBoutWorld", () => {
    it("creates a world with two rikishi", () => {
      const east = mockRikishi("r-east", { shikona: "Alpha" });
      const west = mockRikishi("r-west", { shikona: "Beta" });
      const world = makeBoutWorld(east, west);
      expect(world.rikishi.get("r-east")).toBe(east);
      expect(world.rikishi.get("r-west")).toBe(west);
    });

    it("includes currentBasho when provided via overrides", () => {
      const east = mockRikishi("r-east", { shikona: "Alpha" });
      const west = mockRikishi("r-west", { shikona: "Beta" });
      const world = makeBoutWorld(east, west, {
        currentBasho: {
          id: "b1",
          year: 2025,
          bashoNumber: 1,
          bashoName: "hatsu",
          day: 10,
          matches: [],
          standings: new Map(),
          isActive: true,
        } as any,
      });
      expect(world.currentBasho).toBeDefined();
      expect(world.currentBasho!.day).toBe(10);
    });

    it("does not include currentBasho when not provided", () => {
      const east = mockRikishi("r-east", { shikona: "Alpha" });
      const west = mockRikishi("r-west", { shikona: "Beta" });
      const world = makeBoutWorld(east, west);
      expect(world.currentBasho).toBeUndefined();
    });
  });
});
