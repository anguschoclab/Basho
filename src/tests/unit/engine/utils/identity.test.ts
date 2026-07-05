import { describe, it, expect } from "vitest";
import { isForeign, isCollegeRecruit } from "@/engine/utils/identity";

describe("isForeign", () => {
  describe("native cases (returns false)", () => {
    it("returns false when nationality is undefined", () => {
      expect(isForeign({})).toBe(false);
    });

    it("returns false for 'Japan'", () => {
      expect(isForeign({ nationality: "Japan" })).toBe(false);
    });

    it("returns false for 'japan' (lowercase)", () => {
      expect(isForeign({ nationality: "japan" })).toBe(false);
    });

    it("returns false for 'JAPAN' (uppercase)", () => {
      expect(isForeign({ nationality: "JAPAN" })).toBe(false);
    });

    it("returns false for 'Japanese'", () => {
      expect(isForeign({ nationality: "Japanese" })).toBe(false);
    });

    it("returns false for 'japanese' (lowercase)", () => {
      expect(isForeign({ nationality: "japanese" })).toBe(false);
    });

    it("returns false for empty string (falsy)", () => {
      expect(isForeign({ nationality: "" })).toBe(false);
    });
  });

  describe("foreign cases (returns true)", () => {
    it("returns true for 'Mongolia'", () => {
      expect(isForeign({ nationality: "Mongolia" })).toBe(true);
    });

    it("returns true for 'USA'", () => {
      expect(isForeign({ nationality: "USA" })).toBe(true);
    });

    it("returns true for 'Brazil'", () => {
      expect(isForeign({ nationality: "Brazil" })).toBe(true);
    });

    it("returns true for mixed-case non-Japan (case-insensitive)", () => {
      expect(isForeign({ nationality: "bRaZiL" })).toBe(true);
    });

    it("returns true for 'JP' (not a native variant)", () => {
      expect(isForeign({ nationality: "JP" })).toBe(true);
    });

    it("returns true for 'jp' (not a native variant)", () => {
      expect(isForeign({ nationality: "jp" })).toBe(true);
    });
  });

  describe("shape acceptance", () => {
    it("accepts minimal { nationality?: string } shape", () => {
      expect(isForeign({ nationality: "Mongolia" })).toBe(true);
      expect(isForeign({ nationality: "Japan" })).toBe(false);
    });
  });
});

describe("isCollegeRecruit", () => {
  describe("college cases (returns true)", () => {
    it("returns true for 'Nihon University'", () => {
      expect(isCollegeRecruit({ origin: "Nihon University" })).toBe(true);
    });

    it("returns true for 'Nippon Sport Science Univ' (bug-triggering case)", () => {
      expect(isCollegeRecruit({ origin: "Nippon Sport Science Univ" })).toBe(true);
    });

    it("returns true for 'Kindai University'", () => {
      expect(isCollegeRecruit({ origin: "Kindai University" })).toBe(true);
    });

    it("returns true for 'university of tokyo' (lowercase)", () => {
      expect(isCollegeRecruit({ origin: "university of tokyo" })).toBe(true);
    });

    it("returns true for 'UNIV' (uppercase abbreviation)", () => {
      expect(isCollegeRecruit({ origin: "UNIV" })).toBe(true);
    });

    it("returns true for 'some college'", () => {
      expect(isCollegeRecruit({ origin: "some college" })).toBe(true);
    });
  });

  describe("non-college cases (returns false)", () => {
    it("returns false when origin is undefined", () => {
      expect(isCollegeRecruit({})).toBe(false);
    });

    it("returns false for 'Aomori' (prefecture)", () => {
      expect(isCollegeRecruit({ origin: "Aomori" })).toBe(false);
    });

    it("returns false for 'Mongolia' (foreign country)", () => {
      expect(isCollegeRecruit({ origin: "Mongolia" })).toBe(false);
    });

    it("returns false for 'Hokkaido'", () => {
      expect(isCollegeRecruit({ origin: "Hokkaido" })).toBe(false);
    });

    it("returns false for 'High School'", () => {
      expect(isCollegeRecruit({ origin: "High School" })).toBe(false);
    });

    it("returns false for empty string (falsy)", () => {
      expect(isCollegeRecruit({ origin: "" })).toBe(false);
    });
  });

  describe("shape acceptance", () => {
    it("accepts Pick<Rikishi, 'origin'> (only origin field needed)", () => {
      expect(isCollegeRecruit({ origin: "Nihon University" })).toBe(true);
      expect(isCollegeRecruit({ origin: "Aomori" })).toBe(false);
    });
  });
});
