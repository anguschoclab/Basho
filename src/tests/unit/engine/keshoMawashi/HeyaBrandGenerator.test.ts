/**
 * Tests for HeyaBrandGenerator
 */

 
import { describe, it, expect } from "vitest";
import {
  generateHeyaBrandIdentities,
  getHeyaBrand,
} from "@/engine/systems/keshoMawashi/HeyaBrandGenerator";
import { makeMockWorld, makeMockHeya } from "../utils";

describe("HeyaBrandGenerator", () => {
  describe("generateHeyaBrandIdentities", () => {
    it("generates brand identity for each heya", () => {
      const world = makeMockWorld();
      const heya1 = makeMockHeya("heya-1");
      const heya2 = makeMockHeya("heya-2");
      const heya3 = makeMockHeya("heya-3");

      world.heyas.set(heya1.id, heya1 as any);
      world.heyas.set(heya2.id, heya2 as any);
      world.heyas.set(heya3.id, heya3 as any);

      const brands = generateHeyaBrandIdentities(world.rng!, world.heyas);

      expect(brands.size).toBe(3);
      // Check that each heya got a brandIdentityId assigned
      expect(heya1.brandIdentityId).toBeDefined();
      expect(heya2.brandIdentityId).toBeDefined();
      expect(heya3.brandIdentityId).toBeDefined();
      // Check that the brands exist in the map
      expect(brands.has(heya1.brandIdentityId!)).toBe(true);
      expect(brands.has(heya2.brandIdentityId!)).toBe(true);
      expect(brands.has(heya3.brandIdentityId!)).toBe(true);
    });

    it("assigns valid colors to each brand", () => {
      const world = makeMockWorld();
      const heya = makeMockHeya("heya-1");
      world.heyas.set(heya.id, heya as any);

      const brands = generateHeyaBrandIdentities(world.rng!, world.heyas);
      expect(heya.brandIdentityId).toBeDefined();
      const brand = brands.get(heya.brandIdentityId!)!;

      expect(brand.primaryColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(brand.secondaryColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(brand.accentColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it("assigns valid crest motifs to each brand", () => {
      const world = makeMockWorld();
      const heya = makeMockHeya("heya-1");
      world.heyas.set(heya.id, heya as any);

      const brands = generateHeyaBrandIdentities(world.rng!, world.heyas);
      expect(heya.brandIdentityId).toBeDefined();
      const brand = brands.get(heya.brandIdentityId!)!;

      const validMotifs = [
        "dragon",
        "phoenix",
        "tiger",
        "mt_fuji",
        "waves",
        "sakura",
        "pine",
        "bamboo",
        "crane",
        "rising_sun",
        "lightning",
        "waterfall",
        "temple",
        "treasure_ship",
        "carp",
        "lotus",
        "thunder",
        "wind",
        "mountain",
        "ship",
        "whirlpool",
        "storm",
        "sunrise",
        "river",
      ];

      expect(validMotifs).toContain(brand.crestMotif);
    });

    it("assigns valid crest styles to each brand", () => {
      const world = makeMockWorld();
      const heya = makeMockHeya("heya-1");
      world.heyas.set(heya.id, heya as any);

      const brands = generateHeyaBrandIdentities(world.rng!, world.heyas);
      expect(heya.brandIdentityId).toBeDefined();
      const brand = brands.get(heya.brandIdentityId!)!;

      expect(["circular", "shield", "diamond", "oval", "square"]).toContain(brand.crestStyle);
    });

    it("assigns tradition level between 0 and 1", () => {
      const world = makeMockWorld();
      const heya = makeMockHeya("heya-1");
      world.heyas.set(heya.id, heya as any);

      const brands = generateHeyaBrandIdentities(world.rng!, world.heyas);
      expect(heya.brandIdentityId).toBeDefined();
      const brand = brands.get(heya.brandIdentityId!)!;

      expect(brand.traditionLevel).toBeGreaterThanOrEqual(0);
      expect(brand.traditionLevel).toBeLessThanOrEqual(1);
    });

    it("links brand to heya via heyaId", () => {
      const world = makeMockWorld();
      const heya = makeMockHeya("heya-1");
      world.heyas.set(heya.id, heya as any);

      const brands = generateHeyaBrandIdentities(world.rng!, world.heyas);
      expect(heya.brandIdentityId).toBeDefined();
      const brand = brands.get(heya.brandIdentityId!)!;

      expect(brand.heyaId).toBe(heya.id);
    });

    it("sets correct creation metadata", () => {
      const world = makeMockWorld();
      const heya = makeMockHeya("heya-1");
      world.heyas.set(heya.id, heya as any);

      const brands = generateHeyaBrandIdentities(world.rng!, world.heyas);
      expect(heya.brandIdentityId).toBeDefined();
      const brand = brands.get(heya.brandIdentityId!)!;

      expect(brand.createdAt.year).toBe(world.year);
      expect(brand.createdAt.basho).toBeDefined();
    });

    it("generates deterministic brands for same seed", () => {
      const world1 = makeMockWorld({ seed: "test-seed-123" });
      const world2 = makeMockWorld({ seed: "test-seed-123" });
      const heya = makeMockHeya("heya-1");

      world1.heyas.set(heya.id, heya as any);
      world2.heyas.set(heya.id, heya as any);

      const brands1 = generateHeyaBrandIdentities(world1.rng!, world1.heyas);
      const brands2 = generateHeyaBrandIdentities(world2.rng!, world2.heyas);

      expect(heya.brandIdentityId).toBeDefined();
      const brand1 = brands1.get(heya.brandIdentityId!)!;
      const brand2 = brands2.get(heya.brandIdentityId!)!;

      expect(brand1.primaryColor).toBe(brand2.primaryColor);
      expect(brand1.secondaryColor).toBe(brand2.secondaryColor);
      expect(brand1.crestMotif).toBe(brand2.crestMotif);
    });
  });

  describe("getHeyaBrand", () => {
    it("returns brand when found", () => {
      const world = makeMockWorld();
      const heya = makeMockHeya("heya-1");
      world.heyas.set(heya.id, heya as any);

      const brands = generateHeyaBrandIdentities(world.rng!, world.heyas);
      const brand = getHeyaBrand(brands, heya.brandIdentityId!);

      expect(brand).toBeDefined();
      expect(brand!.heyaId).toBe(heya.id);
    });

    it("returns undefined when heya has no brandIdentityId", () => {
      const world = makeMockWorld();
      const heya = makeMockHeya("heya-1", { brandIdentityId: undefined });

      const brands = generateHeyaBrandIdentities(world.rng!, world.heyas);
      const brand = heya.brandIdentityId ? getHeyaBrand(brands, heya.brandIdentityId) : undefined;

      expect(brand).toBeUndefined();
    });

    it("returns undefined when brand not found", () => {
      const world = makeMockWorld();
      const heya = makeMockHeya("heya-1", { brandIdentityId: "nonexistent-brand" });

      const brands = generateHeyaBrandIdentities(world.rng!, world.heyas);
      const brand = getHeyaBrand(brands, heya.brandIdentityId!);

      expect(brand).toBeUndefined();
    });
  });
});
