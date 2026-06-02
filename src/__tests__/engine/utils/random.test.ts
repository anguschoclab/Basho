import { describe, it, expect } from "vitest";
import {
  seededPick,
  seededWeightedPick,
  pick,
  weightedPick,
} from "../../../engine/utils/random";
import { SeededRNG } from "../../../engine/rng";

// Mock SeededRNG for deterministic testing
class MockRNG extends SeededRNG {
  private valueToReturn: number = 0;
  private intToReturn: number = 0;

  constructor() {
    super("test-seed");
  }

  setNext(value: number) {
    this.valueToReturn = value;
  }

  setInt(value: number) {
    this.intToReturn = value;
  }

  override next(): number {
    return this.valueToReturn;
  }

  override int(): number {
    return this.intToReturn;
  }
}

describe("Random Utilities", () => {
  describe("seededPick", () => {
    it("should pick an item based on the rng int", () => {
      const rng = new MockRNG();
      rng.setInt(1);
      const arr = ["a", "b", "c"];
      expect(seededPick(rng, arr)).toBe("b");
    });

    it("should throw an error if the array is empty", () => {
      const rng = new MockRNG();
      expect(() => seededPick(rng, [])).toThrow("seededPick: Cannot pick from empty array.");
    });
  });

  describe("seededWeightedPick", () => {
    it("should pick an item based on its weight", () => {
      const rng = new MockRNG();
      const items = [
        { item: "a", weight: 1 },
        { item: "b", weight: 2 },
        { item: "c", weight: 1 },
      ]; // Total weight: 4

      // Mock rng.next() to return 0.5. r = 0.5 * 4 = 2.0
      // 'a' weight is 1. 2.0 < 1 is false. r becomes 1.0
      // 'b' weight is 2. 1.0 < 2 is true. Returns 'b'.
      rng.setNext(0.5);
      expect(seededWeightedPick(rng, items)).toBe("b");

      // Mock rng.next() to return 0.1. r = 0.1 * 4 = 0.4
      // 'a' weight is 1. 0.4 < 1 is true. Returns 'a'.
      rng.setNext(0.1);
      expect(seededWeightedPick(rng, items)).toBe("a");

      // Mock rng.next() to return 0.9. r = 0.9 * 4 = 3.6
      // 'a' weight is 1. 3.6 < 1 is false. r becomes 2.6
      // 'b' weight is 2. 2.6 < 2 is false. r becomes 0.6
      // 'c' weight is 1. 0.6 < 1 is true. Returns 'c'.
      rng.setNext(0.9);
      expect(seededWeightedPick(rng, items)).toBe("c");
    });
  });

  describe("pick", () => {
    it("should pick an item based on procedural rng", () => {
      const arr = ["a", "b", "c"];
      let val = 0;
      const rng = () => val;

      val = 0.1; // 0.1 * 3 = 0.3 -> floor(0.3) = 0 ('a')
      expect(pick(arr, rng)).toBe("a");

      val = 0.5; // 0.5 * 3 = 1.5 -> floor(1.5) = 1 ('b')
      expect(pick(arr, rng)).toBe("b");

      val = 0.9; // 0.9 * 3 = 2.7 -> floor(2.7) = 2 ('c')
      expect(pick(arr, rng)).toBe("c");
    });
  });

  describe("weightedPick", () => {
    it("should pick an item based on its weight and procedural rng", () => {
      const items = [
        { item: "a", w: 1 },
        { item: "b", w: 2 },
        { item: "c", w: 1 },
      ]; // Total w: 4

      let val = 0;
      const rng = () => val;

      val = 0.5; // r = 0.5 * 4 = 2.0
      // 'a' w:1. r=1.0, not <=0
      // 'b' w:2. r=-1.0, <=0 -> 'b'
      expect(weightedPick(items, rng)).toBe("b");

      val = 0.1; // r = 0.1 * 4 = 0.4
      // 'a' w:1. r=-0.6, <=0 -> 'a'
      expect(weightedPick(items, rng)).toBe("a");

      val = 0.9; // r = 0.9 * 4 = 3.6
      // 'a' w:1. r=2.6
      // 'b' w:2. r=0.6
      // 'c' w:1. r=-0.4 <= 0 -> 'c'
      expect(weightedPick(items, rng)).toBe("c");
    });

    it("should return the first item if total weight is 0", () => {
      const items = [
        { item: "a", w: 0 },
        { item: "b", w: 0 },
      ];
      const rng = () => 0.5;
      expect(weightedPick(items, rng)).toBe("a");
    });

    it("should ignore negative weights", () => {
      const items = [
        { item: "a", w: -1 },
        { item: "b", w: 1 },
      ];
      const rng = () => 0.5; // r = 0.5 * 1 = 0.5. 'a' w:0. r=0.5. 'b' w:1. r=-0.5 -> 'b'
      expect(weightedPick(items, rng)).toBe("b");
    });
  });
});
