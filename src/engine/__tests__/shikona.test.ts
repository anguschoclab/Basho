import { describe, it, expect } from "vitest";
import { generateShikona, generateRikishiName, generateOyakataName } from "../shikona";

describe("shikona generation", () => {
  describe("generateShikona", () => {
    it("should be deterministic with the same seed and config", () => {
      const seed = "test-seed";
      const config = { nationality: "Mongolia", heyaId: "heya-1", rank: "Yokozuna" };
      const name1 = generateShikona(seed, config);
      const name2 = generateShikona(seed, config);
      expect(name1).toBe(name2);
      expect(name1).toBe("Ichiumi"); // Specifically checked for this seed/config.
    });

    it("should produce different names for different seeds", () => {
      const name1 = generateShikona("seed-1");
      const name2 = generateShikona("seed-2");
      expect(name1).not.toBe(name2);
    });

    it("should influence name based on nationality", () => {
      // Mongolia prefixes: ["Teru", "Haku", "Ichi", "Ao", "Ryu", "Dai"]
      const mongoliaConfig = { nationality: "Mongolia" };
      const names = Array.from({ length: 50 }, (_, i) => generateShikona(`seed-${i}`, mongoliaConfig));

      const mongolianPrefixes = ["Teru", "Haku", "Ichi", "Ao", "Ryu", "Dai"];
      const hasMongolianPrefix = names.some(name =>
        mongolianPrefixes.some(prefix => name.startsWith(prefix))
      );

      expect(hasMongolianPrefix).toBe(true);
    });

    it("should influence name based on heyaId (house style)", () => {
      const seed = "fixed-seed";
      const name1 = generateShikona(seed, { heyaId: "heya-1" });
      const name2 = generateShikona(seed, { heyaId: "heya-2" });

      expect(name1).not.toBe(name2);
    });

    it("should handle different rank tiers", () => {
      const ranks = ["Jonokuchi", "Makushita", "Juryo", "Makuuchi", "Ozeki", "Yokozuna"];
      ranks.forEach(rank => {
        const name = generateShikona("seed", { rank });
        expect(typeof name).toBe("string");
        expect(name.length).toBeGreaterThan(0);
      });
    });

    it("should handle preferPrestigious flag", () => {
      // At legend rank (Yokozuna), prestigeChance is higher (0.16)
      const config = { preferPrestigious: true, rank: "Yokozuna" };
      const names = Array.from({ length: 50 }, (_, i) => generateShikona(`seed-${i}`, config));

      const PRESTIGIOUS_FULL_NAMES = [
        "Hakuryu", "Kaio", "Takanofuji", "Wakatora", "Asashoryu",
        "Kotoshogiku", "Tochishima", "Terunofuji", "Mitakeumi",
        "Ichinojo", "Aoiyama", "Kirishima", "Tamanoshima"
      ];

      const hasPrestigiousName = names.some(name => PRESTIGIOUS_FULL_NAMES.includes(name));
      expect(hasPrestigiousName).toBe(true);
    });

    it("should capitalize the first letter", () => {
      const name = generateShikona("test");
      expect(name[0]).toBe(name[0].toUpperCase());
    });

    it("should handle unknown nationality by falling back to default", () => {
        const name = generateShikona("seed", { nationality: "UnknownCountry" });
        expect(typeof name).toBe("string");
        expect(name.length).toBeGreaterThan(0);
    });

    it("should handle missing config", () => {
        const name = generateShikona("seed");
        expect(typeof name).toBe("string");
        expect(name.length).toBeGreaterThan(0);
    });
  });

  describe("generateRikishiName", () => {
    it("should be deterministic", () => {
      const seed = "abc";
      expect(generateRikishiName(seed)).toBe(generateRikishiName(seed));
    });

    it("should return a non-empty string", () => {
        expect(generateRikishiName("xyz").length).toBeGreaterThan(0);
    });
  });

  describe("generateOyakataName", () => {
    it("should be deterministic", () => {
      const seed = "abc";
      expect(generateOyakataName(seed)).toBe(generateOyakataName(seed));
    });

    it("should pick from the predefined list of elder names", () => {
      const OYAKATA_NAMES = [
        "Miyagino", "Isegahama", "Kokonoe", "Takasago", "Dewanoumi",
        "Hakkaku", "Futagoyama", "Shibatayama", "Arashio", "Tokitsukaze",
        "Kasugano", "Oguruma", "Kise", "Tamanoi", "Oshima"
      ];
      const name = generateOyakataName("some-seed");
      expect(OYAKATA_NAMES).toContain(name);
    });

    it("should give different results for different seeds (eventually)", () => {
        const name1 = generateOyakataName("seed-a");
        const name2 = generateOyakataName("seed-b");
        // They might be the same by chance since the pool is small (15),
        // but let's try a few until we find a difference.
        let different = false;
        for (let i = 0; i < 10; i++) {
            if (generateOyakataName(`seed-${i}`) !== generateOyakataName(`seed-${i+1}`)) {
                different = true;
                break;
            }
        }
        expect(different).toBe(true);
    });
  });
});
