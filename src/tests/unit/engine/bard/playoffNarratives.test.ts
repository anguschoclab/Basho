 
import { describe, it, expect, beforeAll } from "vitest";
import { BardEngine } from "@/engine/bard/BardEngine";
import { rngFromSeed } from "@/engine/rng";

describe("Playoff Narratives", () => {
  beforeAll(async () => {
    await BardEngine.ensureDomains(["pre_bout", "post_bout"]);
  });

  describe("pre_bout.playoff_bout", () => {
    it("resolves without [MISSING: tokens", () => {
      const rng = rngFromSeed("test-seed", "test", "playoff-pre");
      const result = BardEngine.resolve(rng, "pre_bout.playoff_bout", {
        EAST: "Hakuho",
        WEST: "Terunofuji",
      });
      expect(result.text).not.toContain("[MISSING:");
      expect(result.text).not.toContain("%EAST%");
      expect(result.text).not.toContain("%WEST%");
    });

    it("has at least 3 variants (original + PR #746 additions)", () => {
      const variants = new Set<string>();
      for (let i = 0; i < 20; i++) {
        const rng = rngFromSeed(`test-seed-${i}`, "test", "playoff-pre");
        const result = BardEngine.resolve(rng, "pre_bout.playoff_bout", {
          EAST: "Hakuho",
          WEST: "Terunofuji",
        });
        variants.add(result.text);
      }
      expect(variants.size).toBeGreaterThanOrEqual(3);
    });

    it("interpolates EAST and WEST tokens correctly", () => {
      const rng = rngFromSeed("test-seed", "test", "playoff-pre");
      const result = BardEngine.resolve(rng, "pre_bout.playoff_bout", {
        EAST: "Asanoyama",
        WEST: "Takakeisho",
      });
      expect(result.text).toContain("Asanoyama");
      expect(result.text).toContain("Takakeisho");
    });
  });

  describe("post_bout.playoff_result", () => {
    it("resolves without [MISSING: tokens", () => {
      const rng = rngFromSeed("test-seed", "test", "playoff-post");
      const result = BardEngine.resolve(rng, "post_bout.playoff_result", {
        WINNER: "Hakuho",
        LOSER: "Terunofuji",
      });
      expect(result.text).not.toContain("[MISSING:");
      expect(result.text).not.toContain("%WINNER%");
      expect(result.text).not.toContain("%LOSER%");
    });

    it("has at least 3 variants (original + PR #746 additions)", () => {
      const variants = new Set<string>();
      for (let i = 0; i < 20; i++) {
        const rng = rngFromSeed(`test-seed-${i}`, "test", "playoff-post");
        const result = BardEngine.resolve(rng, "post_bout.playoff_result", {
          WINNER: "Hakuho",
          LOSER: "Terunofuji",
        });
        variants.add(result.text);
      }
      expect(variants.size).toBeGreaterThanOrEqual(3);
    });

    it("interpolates WINNER and LOSER tokens correctly", () => {
      const rng = rngFromSeed("test-seed", "test", "playoff-post");
      const result = BardEngine.resolve(rng, "post_bout.playoff_result", {
        WINNER: "Asanoyama",
        LOSER: "Takakeisho",
      });
      expect(result.text).toContain("Asanoyama");
      expect(result.text).toContain("Takakeisho");
    });
  });
});
