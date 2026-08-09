import { describe, it, expect } from "vitest";
import { stableSort, stableTieBreak } from "@/engine/utils/sort";

describe("stableSort", () => {
  it("sorts by key string correctly", () => {
    const input = [
      { id: 2, key: "b" },
      { id: 1, key: "a" },
      { id: 3, key: "c" },
    ];
    const result = stableSort(input, (x) => x.key);
    expect(result.map((x) => x.id)).toEqual([1, 2, 3]);
  });

  it("is stable for identical keys", () => {
    const input = [
      { id: 1, key: "a" },
      { id: 2, key: "b" },
      { id: 3, key: "a" },
    ];
    const result = stableSort(input, (x) => x.key);
    expect(result.map((x) => x.id)).toEqual([1, 3, 2]);
  });

  it("handles empty arrays", () => {
    expect(stableSort([], (x) => String(x))).toEqual([]);
  });

  it("sorts reverse correctly", () => {
    const input = [
      { id: 1, key: "a" },
      { id: 2, key: "b" },
      { id: 3, key: "c" },
    ];
    const result = stableSort(input, (x) => x.key);
    expect(result.map((x) => x.id)).toEqual([1, 2, 3]);

    const inputRev = [
      { id: 3, key: "c" },
      { id: 2, key: "b" },
      { id: 1, key: "a" },
    ];
    const resultRev = stableSort(inputRev, (x) => x.key);
    expect(resultRev.map((x) => x.id)).toEqual([1, 2, 3]);
  });
});

describe("stableTieBreak", () => {
  it("returns -1 when a < b", () => {
    expect(stableTieBreak("a", "b")).toBe(-1);
    expect(stableTieBreak(1, 2)).toBe(-1);
  });

  it("returns 1 when a > b", () => {
    expect(stableTieBreak("b", "a")).toBe(1);
    expect(stableTieBreak(2, 1)).toBe(1);
  });

  it("returns 0 when a === b", () => {
    expect(stableTieBreak("a", "a")).toBe(0);
    expect(stableTieBreak(1, 1)).toBe(0);
  });
});
