import { describe, it, expect } from "vitest";
import { stableSort, stableTieBreak } from "../../../../src/engine/utils/sort";

describe("Sort Utilities", () => {
  describe("stableSort", () => {
    it("should sort an array based on the key function", () => {
      const arr = [
        { id: 3, name: "c" },
        { id: 1, name: "a" },
        { id: 2, name: "b" },
      ];
      const sorted = stableSort(arr, (x) => x.name);
      expect(sorted).toEqual([
        { id: 1, name: "a" },
        { id: 2, name: "b" },
        { id: 3, name: "c" },
      ]);
    });

    it("should be stable", () => {
      // Elements with the same key should retain their relative order
      const arr = [
        { id: 1, group: "b" },
        { id: 2, group: "a" },
        { id: 3, group: "b" },
      ];
      const sorted = stableSort(arr, (x) => x.group);
      expect(sorted).toEqual([
        { id: 2, group: "a" },
        { id: 1, group: "b" },
        { id: 3, group: "b" },
      ]);
    });

    it("should handle iterables", () => {
      const set = new Set([
        { id: 2, val: "b" },
        { id: 1, val: "a" },
      ]);
      const sorted = stableSort(set, (x) => x.val);
      expect(sorted).toEqual([
        { id: 1, val: "a" },
        { id: 2, val: "b" },
      ]);
    });
  });

  describe("stableTieBreak", () => {
    it("should return -1 if a < b", () => {
      expect(stableTieBreak("a", "b")).toBe(-1);
      expect(stableTieBreak(1, 2)).toBe(-1);
    });

    it("should return 1 if a > b", () => {
      expect(stableTieBreak("b", "a")).toBe(1);
      expect(stableTieBreak(2, 1)).toBe(1);
    });

    it("should return 0 if a === b", () => {
      expect(stableTieBreak("a", "a")).toBe(0);
      expect(stableTieBreak(1, 1)).toBe(0);
    });
  });
});
