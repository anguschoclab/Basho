/**
 * colorMaps.test.ts
 *
 * Tests for color map utility functions.
 */

import { describe, it, expect } from "vitest";
import {
  STATUS_COLORS,
  BAND_COLORS,
  getHeatBandColor,
  getHeatBandLabel,
} from "../../../components/ui/colorMaps";

describe("colorMaps", () => {
  describe("STATUS_COLORS", () => {
    it("should have status color mappings", () => {
      expect(STATUS_COLORS).toBeDefined();
      expect(STATUS_COLORS.active).toBeDefined();
      expect(STATUS_COLORS.inactive).toBeDefined();
    });
  });

  describe("BAND_COLORS", () => {
    it("should have band color mappings", () => {
      expect(BAND_COLORS).toBeDefined();
      expect(BAND_COLORS.peak).toBeDefined();
      expect(BAND_COLORS.good).toBeDefined();
      expect(BAND_COLORS.fair).toBeDefined();
    });
  });

  describe("getHeatBandColor", () => {
    it("should return color for high heat", () => {
      const color = getHeatBandColor(80);
      expect(color).toBeDefined();
    });

    it("should return color for low heat", () => {
      const color = getHeatBandColor(10);
      expect(color).toBeDefined();
    });
  });

  describe("getHeatBandLabel", () => {
    it("should return label for high heat", () => {
      const label = getHeatBandLabel(80);
      expect(label).toBeDefined();
      expect(typeof label).toBe("string");
    });

    it("should return label for low heat", () => {
      const label = getHeatBandLabel(10);
      expect(label).toBeDefined();
      expect(typeof label).toBe("string");
    });
  });
});
