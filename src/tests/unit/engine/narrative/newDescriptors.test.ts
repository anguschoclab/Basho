/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */
import { describe, it, expect, beforeAll } from "vitest";
import { BardEngine } from "@/engine/bard/BardEngine";
import { rngFromSeed } from "@/engine/rng";

describe("New Rikishi Descriptor Templates", () => {
  let rng: ReturnType<typeof rngFromSeed>;

  beforeAll(async () => {
    await BardEngine.loadDomains();
    rng = rngFromSeed("test-descriptors", "narrative", "test");
  });

  describe("quirks descriptors", () => {
    it("poor_eyesight resolves", () => {
      const result = BardEngine.resolve(rng, "rikishi.descriptors.quirks.poor_eyesight");
      expect(result.text).toBeTruthy();
      expect(result.text).not.toContain("[MISSING:");
    });

    it("gymnast_background resolves", () => {
      const result = BardEngine.resolve(rng, "rikishi.descriptors.quirks.gymnast_background");
      expect(result.text).toBeTruthy();
      expect(result.text).not.toContain("[MISSING:");
    });

    it("foreign_heritage resolves", () => {
      const result = BardEngine.resolve(rng, "rikishi.descriptors.quirks.foreign_heritage");
      expect(result.text).toBeTruthy();
      expect(result.text).not.toContain("[MISSING:");
    });

    it("fashion_conscious resolves", () => {
      const result = BardEngine.resolve(rng, "rikishi.descriptors.quirks.fashion_conscious");
      expect(result.text).toBeTruthy();
      expect(result.text).not.toContain("[MISSING:");
    });
  });

  describe("weight_journey descriptors", () => {
    it("bulking resolves", () => {
      const result = BardEngine.resolve(rng, "rikishi.descriptors.weight_journey.bulking");
      expect(result.text).toBeTruthy();
      expect(result.text).not.toContain("[MISSING:");
    });

    it("filled_out resolves", () => {
      const result = BardEngine.resolve(rng, "rikishi.descriptors.weight_journey.filled_out");
      expect(result.text).toBeTruthy();
      expect(result.text).not.toContain("[MISSING:");
    });

    it("mass_gain_complete resolves", () => {
      const result = BardEngine.resolve(rng, "rikishi.descriptors.weight_journey.mass_gain_complete");
      expect(result.text).toBeTruthy();
      expect(result.text).not.toContain("[MISSING:");
    });
  });

  describe("pre_sumo_background descriptors", () => {
    it("gymnast resolves", () => {
      const result = BardEngine.resolve(rng, "rikishi.descriptors.pre_sumo_background.gymnast");
      expect(result.text).toBeTruthy();
      expect(result.text).not.toContain("[MISSING:");
    });

    it("judoka resolves", () => {
      const result = BardEngine.resolve(rng, "rikishi.descriptors.pre_sumo_background.judoka");
      expect(result.text).toBeTruthy();
      expect(result.text).not.toContain("[MISSING:");
    });

    it("baseball resolves", () => {
      const result = BardEngine.resolve(rng, "rikishi.descriptors.pre_sumo_background.baseball");
      expect(result.text).toBeTruthy();
      expect(result.text).not.toContain("[MISSING:");
    });

    it("wrestler resolves", () => {
      const result = BardEngine.resolve(rng, "rikishi.descriptors.pre_sumo_background.wrestler");
      expect(result.text).toBeTruthy();
      expect(result.text).not.toContain("[MISSING:");
    });

    it("soccer resolves", () => {
      const result = BardEngine.resolve(rng, "rikishi.descriptors.pre_sumo_background.soccer");
      expect(result.text).toBeTruthy();
      expect(result.text).not.toContain("[MISSING:");
    });

    it("track resolves", () => {
      const result = BardEngine.resolve(rng, "rikishi.descriptors.pre_sumo_background.track");
      expect(result.text).toBeTruthy();
      expect(result.text).not.toContain("[MISSING:");
    });

    it("none resolves", () => {
      const result = BardEngine.resolve(rng, "rikishi.descriptors.pre_sumo_background.none");
      expect(result.text).toBeTruthy();
      expect(result.text).not.toContain("[MISSING:");
    });
  });

  describe("cohort descriptors", () => {
    it("cohort_leader resolves", () => {
      const result = BardEngine.resolve(rng, "rikishi.descriptors.cohort.cohort_leader");
      expect(result.text).toBeTruthy();
      expect(result.text).not.toContain("[MISSING:");
    });

    it("cohort_all_sekitori resolves", () => {
      const result = BardEngine.resolve(rng, "rikishi.descriptors.cohort.cohort_all_sekitori");
      expect(result.text).toBeTruthy();
      expect(result.text).not.toContain("[MISSING:");
    });
  });
});
