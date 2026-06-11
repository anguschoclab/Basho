import { describe, it, expect } from "vitest";
import { RNGRegistry } from "@/engine/core/RNGRegistry";
import type { WorldState } from "@/engine/types/world";

describe("RNGRegistry", () => {
  const mockWorld: WorldState = {
    seed: "test-seed",
    calendar: {
      currentWeek: 4,
    },
  } as unknown as WorldState;

  const mockWorldDefaultSeed: WorldState = {
    calendar: {
      currentWeek: 4,
    },
  } as unknown as WorldState;

  describe("getSystemRNG", () => {
    it("should generate a seeded RNG", () => {
      const rng1 = RNGRegistry.getSystemRNG(mockWorld, "training");
      const rng2 = RNGRegistry.getSystemRNG(mockWorld, "training");

      expect(rng1).toHaveProperty("next");
      // Should be deterministic
      expect(rng1.next()).toBe(rng2.next());
    });

    it("should use default seed if world.seed is missing", () => {
      const rng = RNGRegistry.getSystemRNG(mockWorldDefaultSeed, "training");
      expect(rng).toHaveProperty("next");
    });

    it("should use cadence if provided", () => {
      const rng1 = RNGRegistry.getSystemRNG(mockWorld, "training", "week::1");
      const rng2 = RNGRegistry.getSystemRNG(mockWorld, "training", "week::2");

      expect(rng1.next()).not.toBe(rng2.next());
    });
  });

  describe("getTrainingRNG", () => {
    it("should generate a seeded RNG for training", () => {
      const rng = RNGRegistry.getTrainingRNG(mockWorld);
      expect(rng).toHaveProperty("next");
    });
  });

  describe("getScoutingRNG", () => {
    it("should generate a seeded RNG for scouting", () => {
      const rng = RNGRegistry.getScoutingRNG(mockWorld);
      expect(rng).toHaveProperty("next");
    });
  });
});
