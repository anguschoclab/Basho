import { describe, it, expect } from "vitest";
import { generateShikona, generateOyakataName, generateRikishiName } from "../shikona";

describe("Shikona Generation System", () => {
  describe("generateShikona Determinism", () => {
    it("should deterministically generate the same name for the same seed", () => {
      const name1 = generateShikona("test-seed-1");
      const name2 = generateShikona("test-seed-1");
      expect(name1).toBe(name2);
      expect(name1).toBeTruthy();
    });

    it("should generate different names for different seeds", () => {
      const name1 = generateShikona("test-seed-1");
      const name2 = generateShikona("test-seed-2");
      expect(name1).not.toBe(name2);
    });

    it("should deterministically generate the same name for the same config options", () => {
      const config = { nationality: "Mongolia", rank: "Yokozuna", heyaId: "heya1" };
      const name1 = generateShikona("seed", config);
      const name2 = generateShikona("seed", config);
      expect(name1).toBe(name2);
    });
  });

  describe("Nationality Effects", () => {
    it("should respect Mongolian nationality pool by utilizing appropriate prefixes", () => {
      // By using multiple seeds we verify that the pool is restricted.
      // E.g. Mongolian prefixes: "Teru", "Haku", "Ichi", "Ao", "Ryu", "Dai"
      const names = Array.from({ length: 50 }, (_, i) =>
        generateShikona(`mongol-${i}`, { nationality: "Mongolia", rank: "maegashira" })
      );

      // We expect at least some of these names to start with Mongolian prefixes
      const hasMongolianPrefix = names.some(n =>
        n.startsWith("Teru") || n.startsWith("Haku") || n.startsWith("Ichi") ||
        n.startsWith("Ao") || n.startsWith("Ryu") || n.startsWith("Dai")
      );

      expect(hasMongolianPrefix).toBe(true);
    });

    it("should fallback to default pool for unknown nationality", () => {
      const name = generateShikona("fallback", { nationality: "UnknownCountry" });
      expect(typeof name).toBe("string");
      expect(name.length).toBeGreaterThan(0);
    });
  });

  describe("Rank Tier Rules", () => {
    it("should generate a prestigious name for Yokozuna rank if lucky", () => {
      let foundPrestigious = false;
      const PRESTIGIOUS_FULL_NAMES = [
        "Hakuryu", "Kaio", "Takanofuji", "Wakatora", "Asashoryu",
        "Kotoshogiku", "Tochishima", "Terunofuji", "Mitakeumi",
        "Ichinojo", "Aoiyama", "Kirishima", "Tamanoshima"
      ];

      // Force generating names at top rank until we hit the prestige chance
      for (let i = 0; i < 50; i++) {
        const name = generateShikona(`rank-test-${i}`, { rank: "yokozuna", preferPrestigious: true });
        if (PRESTIGIOUS_FULL_NAMES.includes(name) || PRESTIGIOUS_FULL_NAMES.some(p => name.startsWith(p))) {
          foundPrestigious = true;
          break;
        }
      }
      expect(foundPrestigious).toBe(true);
    });
  });

  describe("Legacy API Helpers", () => {
    it("should generate a rikishi name matching the main function output", () => {
      const seed = "legacy-seed";
      const name1 = generateRikishiName(seed);
      const name2 = generateShikona(seed);
      expect(name1).toBe(name2);
    });

    it("should deterministically generate oyakata names", () => {
      const name1 = generateOyakataName("oyakata-1");
      const name2 = generateOyakataName("oyakata-1");
      expect(name1).toBe(name2);
      expect(typeof name1).toBe("string");

      const name3 = generateOyakataName("oyakata-2");
      expect(name3).toBeTruthy();
    });
  });
});
