/**
 * facilityProjections.test.ts
 *
 * Tests for facility projection functions.
 */

import { describe, it, expect } from "vitest";
import {
  getFacilityLevelLabel,
  getFacilityLevelColor,
} from "../../presenters/projections/facilityProjections";
import { SeededRNG } from "../../engine/rng";

describe("facilityProjections", () => {
  describe("getFacilityLevelLabel", () => {
    it("should return 'limited' for low levels", () => {
      const rng = new SeededRNG("test");
      const label = getFacilityLevelLabel(rng, 10);
      expect(label).toBeDefined();
      expect(typeof label).toBe("string");
    });

    it("should return 'exceptional' for high levels", () => {
      const rng = new SeededRNG("test");
      const label = getFacilityLevelLabel(rng, 90);
      expect(label).toBeDefined();
      expect(typeof label).toBe("string");
    });

    it("should return appropriate labels for different level ranges", () => {
      const rng = new SeededRNG("test");

      expect(getFacilityLevelLabel(rng, 85)).toBeDefined();
      expect(getFacilityLevelLabel(rng, 65)).toBeDefined();
      expect(getFacilityLevelLabel(rng, 45)).toBeDefined();
      expect(getFacilityLevelLabel(rng, 25)).toBeDefined();
    });
  });

  describe("getFacilityLevelColor", () => {
    it("should return 'text-gold' for levels >= 85", () => {
      const color = getFacilityLevelColor(85);
      expect(color).toBe("text-gold");
    });

    it("should return 'text-primary' for levels >= 65", () => {
      const color = getFacilityLevelColor(65);
      expect(color).toBe("text-primary");
    });

    it("should return 'text-primary/70' for levels >= 45", () => {
      const color = getFacilityLevelColor(45);
      expect(color).toBe("text-primary/70");
    });

    it("should return 'text-warning' for levels >= 25", () => {
      const color = getFacilityLevelColor(25);
      expect(color).toBe("text-warning");
    });

    it("should return 'text-destructive' for levels < 25", () => {
      const color = getFacilityLevelColor(10);
      expect(color).toBe("text-destructive");
    });
  });
});
