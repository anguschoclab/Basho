import { describe, it, expect } from "vitest";
import { safeRunwayBand, safeKoenkaiBand } from "@/components/economy/economyUtils";

describe("economyUtils", () => {
  describe("safeRunwayBand", () => {
    it("returns each valid band unchanged", () => {
      expect(safeRunwayBand("secure")).toBe("secure");
      expect(safeRunwayBand("comfortable")).toBe("comfortable");
      expect(safeRunwayBand("tight")).toBe("tight");
      expect(safeRunwayBand("critical")).toBe("critical");
      expect(safeRunwayBand("desperate")).toBe("desperate");
    });

    it("returns 'tight' for an invalid string", () => {
      expect(safeRunwayBand("unknown")).toBe("tight");
    });

    it("returns 'tight' for a non-string input", () => {
      expect(safeRunwayBand(42)).toBe("tight");
      expect(safeRunwayBand(null)).toBe("tight");
      expect(safeRunwayBand(undefined)).toBe("tight");
      expect(safeRunwayBand({})).toBe("tight");
    });
  });

  describe("safeKoenkaiBand", () => {
    it("returns each valid band unchanged", () => {
      expect(safeKoenkaiBand("powerful")).toBe("powerful");
      expect(safeKoenkaiBand("strong")).toBe("strong");
      expect(safeKoenkaiBand("moderate")).toBe("moderate");
      expect(safeKoenkaiBand("weak")).toBe("weak");
      expect(safeKoenkaiBand("none")).toBe("none");
    });

    it("returns 'none' for an invalid string", () => {
      expect(safeKoenkaiBand("unknown")).toBe("none");
    });

    it("returns 'none' for a non-string input", () => {
      expect(safeKoenkaiBand(99)).toBe("none");
      expect(safeKoenkaiBand(null)).toBe("none");
      expect(safeKoenkaiBand(undefined)).toBe("none");
      expect(safeKoenkaiBand([])).toBe("none");
    });
  });
});
