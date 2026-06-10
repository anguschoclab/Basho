/**
 * Tests for KeshoMawashiGenerator
 */

 
import { describe, it, expect } from "vitest";
import {
  generateKeshoMawashi,
  generateKeshoForPromotions,
  generateYokozunaTsuna,
  upgradeKeshoMawashi,
} from "../../systems/keshoMawashi/KeshoMawashiGenerator";
import { makeMockWorldWithBrands, mockRikishi } from "../utils";
import { samplePromotionJuryo, samplePromotionMakuuchi, samplePromotionYokozuna } from "./fixtures";

describe("KeshoMawashiGenerator", () => {
  describe("generateKeshoMawashi", () => {
    it("generates valid kesho for juryo tier", () => {
      const world = makeMockWorldWithBrands(1);
      const heya = Array.from(world.heyas.values())[0];
      const rikishi = mockRikishi("test-rikishi", {
        heyaId: heya.id,
        nationality: "Japan",
      });
      world.rikishi.set(rikishi.id, rikishi as any);

      const kesho = generateKeshoMawashi(world, rikishi as any, "juryo");

      expect(kesho).toBeDefined();
      expect(kesho.rikishiId).toBe(rikishi.id);
      expect(kesho.tier).toBe("juryo");
      expect(kesho.goldThreadDensity).toBeLessThan(0.5);
      expect(kesho.mainSymbol).toBeDefined();
      expect(kesho.description).toContain("sekitori");
    });

    it("generates valid kesho for makuuchi tier", () => {
      const world = makeMockWorldWithBrands(1);
      const heya = Array.from(world.heyas.values())[0];
      const rikishi = mockRikishi("test-rikishi", {
        heyaId: heya.id,
        nationality: "Japan",
      });
      world.rikishi.set(rikishi.id, rikishi as any);

      const kesho = generateKeshoMawashi(world, rikishi as any, "makuuchi");

      expect(kesho.tier).toBe("makuuchi");
      expect(kesho.goldThreadDensity).toBeGreaterThanOrEqual(0.4);
      expect(kesho.goldThreadDensity).toBeLessThan(0.7);
    });

    it("generates valid kesho for sanyaku tier", () => {
      const world = makeMockWorldWithBrands(1);
      const heya = Array.from(world.heyas.values())[0];
      const rikishi = mockRikishi("test-rikishi", {
        heyaId: heya.id,
        nationality: "Japan",
      });
      world.rikishi.set(rikishi.id, rikishi as any);

      const kesho = generateKeshoMawashi(world, rikishi as any, "sanyaku");

      expect(kesho.tier).toBe("sanyaku");
      expect(kesho.goldThreadDensity).toBeGreaterThanOrEqual(0.6);
    });

    it("generates valid kesho for yokozuna tier", () => {
      const world = makeMockWorldWithBrands(1);
      const heya = Array.from(world.heyas.values())[0];
      const rikishi = mockRikishi("test-rikishi", {
        heyaId: heya.id,
        nationality: "Japan",
      });
      world.rikishi.set(rikishi.id, rikishi as any);

      const kesho = generateKeshoMawashi(world, rikishi as any, "yokozuna");

      expect(kesho.tier).toBe("yokozuna");
      expect(kesho.goldThreadDensity).toBeGreaterThan(0.8);
      expect(kesho.description).toContain("grand champion");
    });

    it("uses heya brand identity for colors", () => {
      const world = makeMockWorldWithBrands(1);
      const heya = Array.from(world.heyas.values())[0];
      const brand = world.heyaBrandIdentities.get(heya.brandIdentityId!);
      const rikishi = mockRikishi("test-rikishi", {
        heyaId: heya.id,
        nationality: "Japan",
      });
      world.rikishi.set(rikishi.id, rikishi as any);

      const kesho = generateKeshoMawashi(world, rikishi as any, "juryo");

      expect(kesho.primaryColor).toBe(brand!.primaryColor);
      expect(kesho.secondaryColor).toBe(brand!.secondaryColor);
      expect(kesho.accentColor).toBe(brand!.accentColor);
    });

    it("assigns heyaBrandId from rikishi's heya", () => {
      const world = makeMockWorldWithBrands(1);
      const heya = Array.from(world.heyas.values())[0];
      const rikishi = mockRikishi("test-rikishi", {
        heyaId: heya.id,
        nationality: "Japan",
      });
      world.rikishi.set(rikishi.id, rikishi as any);

      const kesho = generateKeshoMawashi(world, rikishi as any, "juryo");

      expect(kesho.heyaBrandId).toBe(heya.brandIdentityId);
    });
  });

  describe("generateKeshoForPromotions", () => {
    it("creates kesho on makushita to juryo promotion", () => {
      const world = makeMockWorldWithBrands(1);
      const heya = Array.from(world.heyas.values())[0];
      const rikishi = mockRikishi("rikishi-1", {
        id: "rikishi-1",
        heyaId: heya.id,
        nationality: "Japan",
        rank: "juryo",
        division: "juryo",
      });
      world.rikishi.set(rikishi.id, rikishi as any);

      const impacts = generateKeshoForPromotions(world, [samplePromotionJuryo]);

      expect(impacts.entities).toBeDefined();
      expect(impacts.entities!.rikishiUpdates).toBeDefined();
      expect(impacts.entities!.rikishiUpdates!.has("rikishi-1")).toBe(true);
    });

    it("upgrades kesho on juryo to makuuchi promotion", () => {
      const world = makeMockWorldWithBrands(1);
      const heya = Array.from(world.heyas.values())[0];
      const rikishi = mockRikishi("rikishi-2", {
        id: "rikishi-2",
        heyaId: heya.id,
        nationality: "Japan",
        rank: "maegashira",
        division: "makuuchi",
      });
      // Pre-populate with juryo kesho
      (rikishi as any).keshoMawashi = {
        id: "old-kesho",
        rikishiId: "rikishi-2",
        heyaBrandId: heya.brandIdentityId,
        tier: "juryo",
        origin: "traditional",
        basePattern: "striped",
        primaryColor: "#000",
        secondaryColor: "#fff",
        accentColor: "#gold",
        goldThreadDensity: 0.3,
        mainSymbol: {
          type: "motif",
          value: "dragon",
          position: "center",
          size: "large",
          prominence: 0.8,
        },
        description: "Old kesho",
        createdAt: { year: 2024, basho: "hatsu" },
      };
      world.rikishi.set(rikishi.id, rikishi as any);

      const impacts = generateKeshoForPromotions(world, [samplePromotionMakuuchi]);

      expect(impacts.entities).toBeDefined();
      expect(impacts.entities!.rikishiUpdates).toBeDefined();
    });

    it("creates yokozuna tsuna on yokozuna promotion", () => {
      const world = makeMockWorldWithBrands(1);
      const heya = Array.from(world.heyas.values())[0];
      const rikishi = mockRikishi("rikishi-4", {
        id: "rikishi-4",
        heyaId: heya.id,
        nationality: "Japan",
        rank: "yokozuna",
        division: "makuuchi",
      });
      world.rikishi.set(rikishi.id, rikishi as any);

      const impacts = generateKeshoForPromotions(world, [samplePromotionYokozuna]);

      expect(impacts.entities).toBeDefined();
      expect(impacts.entities!.rikishiUpdates).toBeDefined();
      const update = impacts.entities!.rikishiUpdates!.get("rikishi-4");
      expect(update).toBeDefined();
      expect((update as any).yokozunaTsuna).toBeDefined();
    });

    it("generates no impacts for demotions", () => {
      const world = makeMockWorldWithBrands(1);
      const demotionEvent = {
        kind: "demotion" as const,
        rikishiId: "rikishi-1",
        from: "juryo-14-east",
        to: "makushita-1-east",
        description: "Demoted",
      };

      const impacts = generateKeshoForPromotions(world, [demotionEvent]);

      // Should have empty or minimal impacts
      expect(impacts.entities?.rikishiUpdates?.size ?? 0).toBe(0);
    });
  });

  describe("generateYokozunaTsuna", () => {
    it("generates valid yokozuna tsuna", () => {
      const world = makeMockWorldWithBrands(1);
      const heya = Array.from(world.heyas.values())[0];
      const rikishi = mockRikishi("test-rikishi", {
        heyaId: heya.id,
        nationality: "Japan",
      });
      world.rikishi.set(rikishi.id, rikishi as any);

      const tsuna = generateYokozunaTsuna(world, rikishi as any);

      expect(tsuna).toBeDefined();
      expect(tsuna.rikishiId).toBe(rikishi.id);
      expect(tsuna.style).toBeOneOf(["shiranui", "unryu", "traditional"]);
      expect(tsuna.ropeColor).toBeOneOf(["white", "gold_accented", "silver_accented"]);
      expect(tsuna.paperTassels).toBeGreaterThanOrEqual(5);
      expect(tsuna.paperTassels).toBeLessThanOrEqual(7);
      expect(tsuna.displayedOnProfile).toBe(true);
      expect(tsuna.isRetired).toBe(false);
    });

    it("sets correct conferral year and basho", () => {
      const world = makeMockWorldWithBrands(1);
      const heya = Array.from(world.heyas.values())[0];
      const rikishi = mockRikishi("test-rikishi", {
        heyaId: heya.id,
        nationality: "Japan",
      });
      world.rikishi.set(rikishi.id, rikishi as any);

      const tsuna = generateYokozunaTsuna(world, rikishi as any);

      expect(tsuna.conferredAt.year).toBe(world.year);
      expect(tsuna.conferredAt.basho).toBeDefined();
    });
  });

  describe("upgradeKeshoMawashi", () => {
    it("upgrades tier and increases gold thread density", () => {
      const world = makeMockWorldWithBrands(1);
      const heya = Array.from(world.heyas.values())[0];
      const baseKesho = {
        id: "old-kesho",
        rikishiId: "test-rikishi",
        heyaBrandId: heya.brandIdentityId!,
        createdAt: { year: 2024, basho: "hatsu" },
        tier: "juryo" as const,
        origin: "traditional" as const,
        basePattern: "striped" as const,
        primaryColor: "#000",
        secondaryColor: "#fff",
        accentColor: "#gold",
        goldThreadDensity: 0.3,
        mainSymbol: {
          type: "motif" as const,
          value: "dragon",
          position: "center" as const,
          size: "large" as const,
          prominence: 0.8,
        },
        description: "Old kesho",
      };

      const upgraded = upgradeKeshoMawashi(baseKesho, "makuuchi", world);

      expect(upgraded.tier).toBe("makuuchi");
      expect(upgraded.goldThreadDensity).toBeGreaterThan(baseKesho.goldThreadDensity);
      expect(upgraded.updatedAt).toBeDefined();
      expect(upgraded.updatedAt!.year).toBe(world.year);
      expect(upgraded.updatedAt!.basho).toBeDefined();
    });

    it("updates description to reflect new tier", () => {
      const world = makeMockWorldWithBrands(1);
      const heya = Array.from(world.heyas.values())[0];
      const baseKesho = {
        id: "old-kesho",
        rikishiId: "test-rikishi",
        heyaBrandId: heya.brandIdentityId!,
        createdAt: { year: 2024, basho: "hatsu" },
        tier: "makuuchi" as const,
        origin: "traditional" as const,
        basePattern: "striped" as const,
        primaryColor: "#000",
        secondaryColor: "#fff",
        accentColor: "#gold",
        goldThreadDensity: 0.5,
        mainSymbol: {
          type: "motif" as const,
          value: "dragon",
          position: "center" as const,
          size: "large" as const,
          prominence: 0.8,
        },
        description: "Old kesho",
      };

      const upgraded = upgradeKeshoMawashi(baseKesho, "yokozuna", world);

      expect(upgraded.description).toContain("yokozuna");
    });
  });
});
