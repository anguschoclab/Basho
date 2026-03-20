import { describe, it, expect } from "vitest";
import { clamp, clampInt, clamp01, simpleHashToIndex } from "../utils/math";

describe("math utilities", () => {
  describe("clamp", () => {
    it("should return the number if it is within range", () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(0, 0, 10)).toBe(0);
      expect(clamp(10, 0, 10)).toBe(10);
    });

    it("should return the lower bound if the number is below range", () => {
      expect(clamp(-5, 0, 10)).toBe(0);
    });

    it("should return the upper bound if the number is above range", () => {
      expect(clamp(15, 0, 10)).toBe(10);
    });

    it("should handle negative ranges", () => {
      expect(clamp(-5, -10, -1)).toBe(-5);
      expect(clamp(-15, -10, -1)).toBe(-10);
      expect(clamp(0, -10, -1)).toBe(-1);
    });
  });

  describe("clampInt", () => {
    it("should truncate and clamp the number", () => {
      expect(clampInt(5.7, 0, 10)).toBe(5);
      expect(clampInt(-5.7, -10, 0)).toBe(-5);
    });

    it("should return the lower bound if the truncated number is below range", () => {
      expect(clampInt(-5, 0, 10)).toBe(0);
    });

    it("should return the upper bound if the truncated number is above range", () => {
      expect(clampInt(15, 0, 10)).toBe(10);
    });

    it("should handle truncating towards zero", () => {
      expect(clampInt(0.9, 0, 10)).toBe(0);
      expect(Math.abs(clampInt(-0.9, -10, 0))).toBe(0);
    });
  });

  describe("clamp01", () => {
    it("should return the number if it is between 0 and 1", () => {
      expect(clamp01(0.5)).toBe(0.5);
      expect(clamp01(0)).toBe(0);
      expect(clamp01(1)).toBe(1);
    });

    it("should return 0 if the number is below 0", () => {
      expect(clamp01(-0.1)).toBe(0);
    });

    it("should return 1 if the number is above 1", () => {
      expect(clamp01(1.1)).toBe(1);
    });
  });

  describe("simpleHashToIndex", () => {
    it("should return a consistent value for the same input", () => {
      const s = "test-string";
      const mod = 100;
      const result1 = simpleHashToIndex(s, mod);
      const result2 = simpleHashToIndex(s, mod);
      expect(result1).toBe(result2);
    });

    it("should return a value within the modulo range", () => {
      const mod = 10;
      for (let i = 0; i < 100; i++) {
        const s = `string-${i}`;
        const result = simpleHashToIndex(s, mod);
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThan(mod);
      }
    });

    it("should handle empty strings", () => {
      const mod = 100;
      const result = simpleHashToIndex("", mod);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThan(mod);
    });

    it("should handle large modulo values", () => {
      const s = "large-mod-test";
      const mod = 1000000;
      const result = simpleHashToIndex(s, mod);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThan(mod);
    });
  });
});
