/**
 * Determinism tests for kesho-mawashi system
 *
 * Verifies that the same seed produces identical results.
 */

import { describe, it, expect } from "vitest";
import { generateHeyaBrandIdentities } from "@/engine/systems/keshoMawashi/HeyaBrandGenerator";
import { generateKeshoMawashi } from "@/engine/systems/keshoMawashi/KeshoMawashiGenerator";
import { makeMockWorld, makeMockHeya, mockRikishi } from "../utils";

describe("Kesho-Mawashi Determinism", () => {
  describe("HeyaBrandIdentity generation", () => {
    it("produces identical brand identities for same seed", () => {
      const world1 = makeMockWorld({ seed: "deterministic-test-123" });
      const world2 = makeMockWorld({ seed: "deterministic-test-123" });

      const heya1 = makeMockHeya("heya-1");
      const heya2 = makeMockHeya("heya-2");

      world1.heyas.set(heya1.id, heya1 as any);
      world1.heyas.set(heya2.id, heya2 as any);
      world2.heyas.set(heya1.id, heya1 as any);
      world2.heyas.set(heya2.id, heya2 as any);

      const brands1 = generateHeyaBrandIdentities(world1.rng!, world1.heyas);
      const brands2 = generateHeyaBrandIdentities(world2.rng!, world2.heyas);

      expect(brands1.size).toBe(brands2.size);

      for (const [id, brand1] of brands1) {
        const brand2 = brands2.get(id);
        expect(brand2).toBeDefined();
        expect(brand1.primaryColor).toBe(brand2!.primaryColor);
        expect(brand1.secondaryColor).toBe(brand2!.secondaryColor);
        expect(brand1.accentColor).toBe(brand2!.accentColor);
        expect(brand1.crestMotif).toBe(brand2!.crestMotif);
        expect(brand1.crestStyle).toBe(brand2!.crestStyle);
        expect(brand1.traditionLevel).toBe(brand2!.traditionLevel);
      }
    });

    it("produces different brand identities for different seeds", () => {
      const world1 = makeMockWorld({ seed: "seed-a" });
      const world2 = makeMockWorld({ seed: "seed-b" });

      const heya = makeMockHeya("heya-1");

      world1.heyas.set(heya.id, heya as any);
      world2.heyas.set(heya.id, heya as any);

      const brands1 = generateHeyaBrandIdentities(world1.rng!, world1.heyas);
      const brands2 = generateHeyaBrandIdentities(world2.rng!, world2.heyas);

      const brand1 = Array.from(brands1.values())[0];
      const brand2 = Array.from(brands2.values())[0];

      // At least one property should differ (extremely unlikely to be identical)
      const identical =
        brand1.primaryColor === brand2.primaryColor &&
        brand1.secondaryColor === brand2.secondaryColor &&
        brand1.accentColor === brand2.accentColor &&
        brand1.crestMotif === brand2.crestMotif &&
        brand1.crestStyle === brand2.crestStyle;

      expect(identical).toBe(false);
    });
  });

  describe("KeshoMawashi generation", () => {
    it("produces identical kesho for same seed and rikishi ID", () => {
      const seed = "kesho-determinism-test";
      const world1 = makeMockWorld({ seed });
      const world2 = makeMockWorld({ seed });

      const heya = makeMockHeya("heya-1");
      const rikishi = mockRikishi("rikishi-1", {
        heyaId: heya.id,
        nationality: "Japan",
      });

      world1.heyas.set(heya.id, heya as any);
      world1.rikishi.set(rikishi.id, rikishi as any);
      world2.heyas.set(heya.id, heya as any);
      world2.rikishi.set(rikishi.id, rikishi as any);

      // Generate brands first
      const brands1 = generateHeyaBrandIdentities(world1.rng!, world1.heyas);
      const brands2 = generateHeyaBrandIdentities(world2.rng!, world2.heyas);

      // Attach brands to worlds
      (world1 as any).heyaBrandIdentities = brands1;
      (world2 as any).heyaBrandIdentities = brands2;

      // Set brand identity ID on heya
      heya.brandIdentityId = Array.from(brands1.values())[0].id;

      const kesho1 = generateKeshoMawashi(world1 as any, rikishi as any, "juryo");
      const kesho2 = generateKeshoMawashi(world2 as any, rikishi as any, "juryo");

      expect(kesho1.primaryColor).toBe(kesho2.primaryColor);
      expect(kesho1.secondaryColor).toBe(kesho2.secondaryColor);
      expect(kesho1.accentColor).toBe(kesho2.accentColor);
      expect(kesho1.basePattern).toBe(kesho2.basePattern);
      expect(kesho1.origin).toBe(kesho2.origin);
      expect(kesho1.mainSymbol.type).toBe(kesho2.mainSymbol.type);
      expect(kesho1.mainSymbol.value).toBe(kesho2.mainSymbol.value);
      expect(kesho1.goldThreadDensity).toBe(kesho2.goldThreadDensity);
    });

    it("produces different kesho for different rikishi IDs with same seed", () => {
      const seed = "kesho-determinism-test";
      const world = makeMockWorld({ seed });

      const heya = makeMockHeya("heya-1");
      const rikishi1 = mockRikishi("rikishi-1", {
        heyaId: heya.id,
        nationality: "Japan",
      });
      const rikishi2 = mockRikishi("rikishi-2", {
        heyaId: heya.id,
        nationality: "Japan",
      });

      world.heyas.set(heya.id, heya as any);

      // Generate brands
      const brands = generateHeyaBrandIdentities(world.rng!, world.heyas);
      (world as any).heyaBrandIdentities = brands;
      heya.brandIdentityId = Array.from(brands.values())[0].id;

      const kesho1 = generateKeshoMawashi(world as any, rikishi1 as any, "juryo");
      const kesho2 = generateKeshoMawashi(world as any, rikishi2 as any, "juryo");

      // Should be different because rikishi ID is part of the seed
      const identical =
        kesho1.mainSymbol.value === kesho2.mainSymbol.value &&
        kesho1.basePattern === kesho2.basePattern &&
        kesho1.origin === kesho2.origin;

      // Extremely unlikely to be identical with different rikishi IDs
      expect(identical).toBe(false);
    });

    it("produces identical kesho when regenerated with same parameters", () => {
      const seed = "regenerate-test";
      const world1 = makeMockWorld({ seed });

      const heya = makeMockHeya("heya-1");
      const rikishi = mockRikishi("rikishi-1", {
        heyaId: heya.id,
        nationality: "Japan",
      });

      world1.heyas.set(heya.id, heya as any);

      // First generation
      const brands = generateHeyaBrandIdentities(world1.rng!, world1.heyas);
      (world1 as any).heyaBrandIdentities = brands;
      heya.brandIdentityId = Array.from(brands.values())[0].id;

      const kesho1a = generateKeshoMawashi(world1 as any, rikishi as any, "makuuchi");

      // Create new world with same seed and regenerate
      const world2 = makeMockWorld({ seed });
      world2.heyas.set(heya.id, heya as any);
      const brands2 = generateHeyaBrandIdentities(world2.rng!, world2.heyas);
      (world2 as any).heyaBrandIdentities = brands2;

      const kesho1b = generateKeshoMawashi(world2 as any, rikishi as any, "makuuchi");

      // Should be identical
      expect(kesho1a.primaryColor).toBe(kesho1b.primaryColor);
      expect(kesho1a.basePattern).toBe(kesho1b.basePattern);
      expect(kesho1a.mainSymbol.value).toBe(kesho1b.mainSymbol.value);
      expect(kesho1a.goldThreadDensity).toBe(kesho1b.goldThreadDensity);
    });
  });
});
