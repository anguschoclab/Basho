import { describe, it, expect } from "vitest";
import { generateSponsorName } from "../sponsors";
import { rngFromSeed } from "../rng";

describe("sponsors", () => {
  describe("generateSponsorName", () => {
    it("should be deterministic for the same seed and tier", () => {
      const seed = "sponsor-seed-1";
      const rng1 = rngFromSeed(seed, "sponsors", "name-gen-1");
      const rng2 = rngFromSeed(seed, "sponsors", "name-gen-1");

      const result1 = generateSponsorName(rng1, "T5");
      const result2 = generateSponsorName(rng2, "T5");

      expect(result1).toEqual(result2);
    });

    it("should produce different names for different seeds", () => {
      const rng1 = rngFromSeed("seed-A", "sponsors", "name-gen");
      const rng2 = rngFromSeed("seed-B", "sponsors", "name-gen");

      const result1 = generateSponsorName(rng1, "T1");
      const result2 = generateSponsorName(rng2, "T1");

      expect(result1).not.toEqual(result2);
    });

    it("should generate names for T5 sponsors", () => {
      const rng = rngFromSeed("t5-seed", "sponsors", "test");
      const result = generateSponsorName(rng, "T5");

      expect(result).toHaveProperty("displayName");
      expect(result).toHaveProperty("shortName");
      expect(typeof result.displayName).toBe("string");
      expect(typeof result.shortName).toBe("string");
    });

    it("should generate names for T3/T4 sponsors", () => {
      const rngT3 = rngFromSeed("t3-seed", "sponsors", "test");
      const resultT3 = generateSponsorName(rngT3, "T3");

      expect(resultT3).toHaveProperty("displayName");
      expect(resultT3).toHaveProperty("shortName");
      expect(typeof resultT3.displayName).toBe("string");
      expect(typeof resultT3.shortName).toBe("string");

      const rngT4 = rngFromSeed("t4-seed", "sponsors", "test");
      const resultT4 = generateSponsorName(rngT4, "T4");

      expect(resultT4).toHaveProperty("displayName");
      expect(resultT4).toHaveProperty("shortName");
      expect(typeof resultT4.displayName).toBe("string");
      expect(typeof resultT4.shortName).toBe("string");
    });

    it("should generate names for default tier (T0, T1, T2) sponsors", () => {
      const rngT0 = rngFromSeed("t0-seed", "sponsors", "test");
      const resultT0 = generateSponsorName(rngT0, "T0");
      expect(resultT0).toHaveProperty("displayName");
      expect(typeof resultT0.shortName).toBe("string");

      const rngT1 = rngFromSeed("t1-seed", "sponsors", "test");
      const resultT1 = generateSponsorName(rngT1, "T1");
      expect(resultT1).toHaveProperty("displayName");
      expect(typeof resultT1.shortName).toBe("string");

      const rngT2 = rngFromSeed("t2-seed", "sponsors", "test");
      const resultT2 = generateSponsorName(rngT2, "T2");
      expect(resultT2).toHaveProperty("displayName");
      expect(typeof resultT2.shortName).toBe("string");
    });

    it("should consistently generate correct shapes for many iterations", () => {
      const rng = rngFromSeed("many-iterations", "sponsors", "test");
      const tiers: ("T0" | "T1" | "T2" | "T3" | "T4" | "T5")[] = ["T0", "T1", "T2", "T3", "T4", "T5"];

      for (let i = 0; i < 100; i++) {
        const tier = tiers[i % tiers.length];
        const result = generateSponsorName(rng, tier);

        expect(result.displayName.length).toBeGreaterThan(0);
        expect(result.shortName.length).toBeGreaterThan(0);
        // Display name is typically longer or equal to short name
        expect(result.displayName.length).toBeGreaterThanOrEqual(result.shortName.length);
      }
    });
  });
});
