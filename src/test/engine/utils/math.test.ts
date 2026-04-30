import { describe, it, expect } from "vitest";
import {
  clamp,
  clampInt,
  clamp01,
  localClampInt,
  simpleHashToIndex,
  formatCurrency,
} from "../../../../src/engine/utils/math";

describe("Math Utilities", () => {
  describe("clamp", () => {
    it("should return the value if within range", () => {
      expect(clamp(5, 0, 10)).toBe(5);
    });

    it("should return the lower bound if value is less than lower bound", () => {
      expect(clamp(-5, 0, 10)).toBe(0);
    });

    it("should return the upper bound if value is greater than upper bound", () => {
      expect(clamp(15, 0, 10)).toBe(10);
    });
  });

  describe("clampInt", () => {
    it("should return the truncated integer if within range", () => {
      expect(clampInt(5.5, 0, 10)).toBe(5);
    });

    it("should return the lower bound if truncated value is less than lower bound", () => {
      expect(clampInt(-5.5, 0, 10)).toBe(0);
    });

    it("should return the upper bound if truncated value is greater than upper bound", () => {
      expect(clampInt(15.5, 0, 10)).toBe(10);
    });
  });

  describe("clamp01", () => {
    it("should return the value if within 0 and 1", () => {
      expect(clamp01(0.5)).toBe(0.5);
    });

    it("should return 0 if value is less than 0", () => {
      expect(clamp01(-0.5)).toBe(0);
    });

    it("should return 1 if value is greater than 1", () => {
      expect(clamp01(1.5)).toBe(1);
    });
  });

  describe("localClampInt", () => {
    it("should return the truncated integer if within range", () => {
      expect(localClampInt(5.5, 0, 10)).toBe(5);
    });

    it("should return the lower bound if truncated value is less than lower bound", () => {
      expect(localClampInt(-5.5, 0, 10)).toBe(0);
    });

    it("should return the upper bound if truncated value is greater than upper bound", () => {
      expect(localClampInt(15.5, 0, 10)).toBe(10);
    });
  });

  describe("simpleHashToIndex", () => {
    it("should return a valid index within the mod range", () => {
      const s = "test string";
      const mod = 10;
      const index = simpleHashToIndex(s, mod);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(mod);
    });

    it("should return the same index for the same string", () => {
      const s = "test string";
      const mod = 10;
      expect(simpleHashToIndex(s, mod)).toBe(simpleHashToIndex(s, mod));
    });

    it("should handle different strings differently", () => {
      const mod = 1000;
      expect(simpleHashToIndex("string1", mod)).not.toBe(simpleHashToIndex("string2", mod));
    });
  });

  describe("formatCurrency", () => {
    it("should format a number as Japanese Yen", () => {
      expect(formatCurrency(1000)).toBe("￥1,000");
    });

    it("should format 0 as Japanese Yen", () => {
      expect(formatCurrency(0)).toBe("￥0");
    });

    it("should format negative numbers as Japanese Yen", () => {
      expect(formatCurrency(-1000)).toBe("-￥1,000");
    });
  });
});
