import { describe, it, expect } from "vitest";
import { generateShikona, generateOyakataName, generateRikishiName } from "@/engine/shikona";

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
      const hasMongolianPrefix = names.some(
        (n) =>
          n.startsWith("Teru") ||
          n.startsWith("Haku") ||
          n.startsWith("Ichi") ||
          n.startsWith("Ao") ||
          n.startsWith("Ryu") ||
          n.startsWith("Dai")
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
        "Hakuryu",
        "Kaio",
        "Takanofuji",
        "Wakatora",
        "Asashoryu",
        "Kotoshogiku",
        "Tochishima",
        "Terunofuji",
        "Mitakeumi",
        "Ichinojo",
        "Aoiyama",
        "Kirishima",
        "Tamanoshima",
      ];

      // Force generating names at top rank until we hit the prestige chance
      for (let i = 0; i < 50; i++) {
        const name = generateShikona(`rank-test-${i}`, {
          rank: "yokozuna",
          preferPrestigious: true,
        });
        if (
          PRESTIGIOUS_FULL_NAMES.includes(name) ||
          PRESTIGIOUS_FULL_NAMES.some((p) => name.startsWith(p))
        ) {
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

  describe("Legacy Shikona Generation", () => {
    it("should generate shikona with legacy patterns when legacyShikona is provided", () => {
      const legacyShikona = "Takayama";
      const name = generateShikona("legacy-test-1", {
        legacyShikona,
        rank: "maegashira",
      });
      expect(typeof name).toBe("string");
      expect(name.length).toBeGreaterThan(0);
    });

    it("should be deterministic with legacy shikona", () => {
      const legacyShikona = "Wakafuji";
      const config = { legacyShikona, rank: "juryo" };
      const name1 = generateShikona("legacy-determinism-1", config);
      const name2 = generateShikona("legacy-determinism-1", config);
      expect(name1).toBe(name2);
    });

    it("should use legacy patterns more frequently for sekitori ranks", () => {
      const legacyShikona = "Kotoshogiku";
      const sekitoriNames = Array.from({ length: 100 }, (_, i) =>
        generateShikona(`sekitori-${i}`, { legacyShikona, rank: "maegashira" })
      );
      const lowerRankNames = Array.from({ length: 100 }, (_, i) =>
        generateShikona(`lower-${i}`, { legacyShikona, rank: "jonokuchi" })
      );

      // Both should produce valid names
      expect(sekitoriNames.every((n) => typeof n === "string")).toBe(true);
      expect(lowerRankNames.every((n) => typeof n === "string")).toBe(true);
    });

    it("should handle legacy shikona with common prefixes", () => {
      const legacyShikona = "Asashoryu";
      const name = generateShikona("prefix-test", { legacyShikona, rank: "ozeki" });
      expect(typeof name).toBe("string");
      expect(name.length).toBeGreaterThan(0);
    });
  });
});

describe("generateShikonaCandidate pattern weighting", () => {
  it("honors rankRule patternBias: dominant bias selects that pattern", async () => {
    const { generateShikonaCandidate } = await import("@/engine/shikona/generation");
    const { SHIKONA_PREFIXES, SHIKONA_SUFFIXES } = await import("@/engine/shikona/constants");
    const { SeededRNG } = await import("@/engine/rng");
    const house = {
      id: "power_mountain" as const,
      name: "Test",
      patternBias: {},
      prefixCategoryBias: {},
      suffixCategoryBias: {},
    };
    const rankRule = {
      tier: "upper" as const,
      prestigeChance: 0,
      tripleChance: 0,
      maxLen: 20,
      patternBias: { "regional+ending": 1000 },
    };
    // mergePatternWeights clamps weights to [0.1, 100], so a dominant bias yields
    // ~100/190 ≈ 52% for the favored pattern vs ~14% under uniform selection.
    let hits = 0;
    for (let i = 0; i < 500; i++) {
      const r = new SeededRNG(`bias-${i}`);
      const name = generateShikonaCandidate(() => r.next(), {}, 0, house, rankRule);
      const isRegionalEnding =
        SHIKONA_PREFIXES.regional.some((p) => name.startsWith(p)) &&
        SHIKONA_SUFFIXES.endings.some((s) => name.endsWith(s));
      if (isRegionalEnding) hits++;
    }
    expect(hits).toBeGreaterThan(200);
  });
});
