import { describe, it, expect } from "vitest";
import { generateOyakata } from "../oyakataPersonalities";

describe("Oyakata Generation", () => {
  describe("Tier-based Rank Distribution", () => {
    it("should generate higher ranks for legendary heya (tier < 0.2)", () => {
      const oyakata = generateOyakata(
        "oyakata-legendary",
        "heya1",
        "TestName",
        50,
        undefined,
        undefined,
        undefined,
        undefined,
        0.1
      );
      expect(oyakata.highestRank).toBeTruthy();
      expect(oyakata.formerShikona).toBeTruthy();
    });

    it("should generate realistic ranks for powerful heya (tier < 0.5)", () => {
      const oyakata = generateOyakata(
        "oyakata-powerful",
        "heya2",
        "TestName",
        50,
        undefined,
        undefined,
        undefined,
        undefined,
        0.3
      );
      expect(oyakata.highestRank).toBeTruthy();
      expect(oyakata.formerShikona).toBeTruthy();
    });

    it("should generate realistic ranks for established heya (tier >= 0.5)", () => {
      const oyakata = generateOyakata(
        "oyakata-established",
        "heya3",
        "TestName",
        50,
        undefined,
        undefined,
        undefined,
        undefined,
        0.7
      );
      expect(oyakata.highestRank).toBeTruthy();
      expect(oyakata.formerShikona).toBeTruthy();
    });
  });

  describe("Former Rank and Shikona Parameters", () => {
    it("should use provided formerRank when given", () => {
      const oyakata = generateOyakata(
        "oyakata-custom-rank",
        "heya1",
        "TestName",
        50,
        undefined,
        undefined,
        "Yokozuna",
        "TestShikona"
      );
      expect(oyakata.highestRank).toBe("Yokozuna");
      expect(oyakata.formerShikona).toBe("TestShikona");
    });

    it("should use provided formerShikona when given", () => {
      const oyakata = generateOyakata(
        "oyakata-custom-shikona",
        "heya1",
        "TestName",
        50,
        undefined,
        undefined,
        undefined,
        "CustomShikona"
      );
      expect(oyakata.formerShikona).toBe("CustomShikona");
    });

    it("should fall back to tier-based distribution when formerRank not provided", () => {
      const oyakata = generateOyakata(
        "oyakata-fallback",
        "heya1",
        "TestName",
        50,
        undefined,
        undefined,
        undefined,
        undefined,
        0.5
      );
      expect(oyakata.highestRank).toBeTruthy();
      expect(oyakata.formerShikona).toBeTruthy();
    });
  });

  describe("Determinism", () => {
    it("should generate the same oyakata for the same seed", () => {
      const oyakata1 = generateOyakata("determinism-test", "heya1", "TestName", 50);
      const oyakata2 = generateOyakata("determinism-test", "heya1", "TestName", 50);
      expect(oyakata1.id).toBe(oyakata2.id);
      expect(oyakata1.archetype).toBe(oyakata2.archetype);
      expect(oyakata1.highestRank).toBe(oyakata2.highestRank);
      expect(oyakata1.formerShikona).toBe(oyakata2.formerShikona);
    });
  });
});
