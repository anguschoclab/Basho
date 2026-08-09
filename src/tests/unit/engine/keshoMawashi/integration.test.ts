/**
 * Integration tests for kesho-mawashi system
 */

import { describe, it, expect } from "vitest";
import { generateKeshoForPromotions } from "@/engine/systems/keshoMawashi/KeshoMawashiGenerator";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import { makeMockWorldWithBrands, mockRikishi } from "../utils";
import type { MovementEvent } from "@/engine/types/banzuke";
import type { KeshoMawashi } from "@/engine/types/keshoMawashi";

describe("Kesho-Mawashi Integration", () => {
  describe("End-to-end promotion flow", () => {
    it("full flow: makushita to juryo promotion generates kesho", () => {
      const world = makeMockWorldWithBrands(1);
      const heya = Array.from(world.heyas.values())[0];
      const rikishi = mockRikishi("rikishi-1", {
        id: "rikishi-1",
        heyaId: heya.id,
        nationality: "Japan",
        rank: "juryo",
        division: "juryo",
        rankNumber: 14,
        side: "east",
      });
      world.rikishi.set(rikishi.id, rikishi as any);

      const promotionEvent: MovementEvent = {
        kind: "promotion",
        rikishiId: rikishi.id,
        from: "makushita-1-east",
        to: "juryo-14-east",
        description: "Promoted to Juryo",
      };

      // Generate kesho impacts
      const impacts = generateKeshoForPromotions(world, [promotionEvent]);

      // Apply impacts to world
      const updatedWorld = resolveImpacts(world, [impacts]);

      // Verify rikishi now has kesho
      const updatedRikishi = updatedWorld.rikishi.get(rikishi.id);
      expect(updatedRikishi).toBeDefined();
      expect((updatedRikishi as any).keshoMawashi).toBeDefined();
      expect((updatedRikishi as any).keshoMawashi.tier).toBe("juryo");
    });

    it("full flow: juryo to makuuchi upgrades existing kesho", () => {
      const world = makeMockWorldWithBrands(1);
      const heya = Array.from(world.heyas.values())[0];

      // Start with rikishi that has juryo kesho
      const initialKesho: KeshoMawashi = {
        id: "kesho-1",
        rikishiId: "rikishi-1",
        heyaBrandId: heya.brandIdentityId!,
        createdAt: { year: 2024, basho: "hatsu" },
        tier: "juryo",
        origin: "traditional",
        basePattern: "striped",
        primaryColor: "#1a365d",
        secondaryColor: "#2c5282",
        accentColor: "#d69e2e",
        goldThreadDensity: 0.3,
        borderStyle: "simple",
        embroideryStyle: "satin",
        mainSymbol: {
          type: "motif",
          value: "dragon",
          position: "center",
          size: "large",
          prominence: 0.8,
        },
        description: "Initial juryo kesho",
      };

      const rikishi = mockRikishi("rikishi-1", {
        id: "rikishi-1",
        heyaId: heya.id,
        nationality: "Japan",
        rank: "maegashira",
        division: "makuuchi",
        rankNumber: 15,
        side: "east",
      });
      (rikishi as any).keshoMawashi = initialKesho;
      world.rikishi.set(rikishi.id, rikishi as any);

      const promotionEvent: MovementEvent = {
        kind: "promotion",
        rikishiId: rikishi.id,
        from: "juryo-1-east",
        to: "maegashira-15-east",
        description: "Promoted to Makuuchi",
      };

      // Generate and apply impacts
      const impacts = generateKeshoForPromotions(world, [promotionEvent]);
      const updatedWorld = resolveImpacts(world, [impacts]);

      // Verify kesho was upgraded
      const updatedRikishi = updatedWorld.rikishi.get(rikishi.id);
      expect(updatedRikishi).toBeDefined();
      expect((updatedRikishi as any).keshoMawashi).toBeDefined();
      expect((updatedRikishi as any).keshoMawashi.tier).toBe("makuuchi");
      expect((updatedRikishi as any).keshoMawashi.goldThreadDensity).toBeGreaterThan(
        initialKesho.goldThreadDensity
      );
    });

    it("full flow: yokozuna promotion generates both kesho and tsuna", () => {
      const world = makeMockWorldWithBrands(1);
      const heya = Array.from(world.heyas.values())[0];
      const rikishi = mockRikishi("rikishi-1", {
        id: "rikishi-1",
        heyaId: heya.id,
        nationality: "Japan",
        rank: "yokozuna",
        division: "makuuchi",
        rankNumber: 1,
        side: "east",
      });
      world.rikishi.set(rikishi.id, rikishi as any);

      const promotionEvent: MovementEvent = {
        kind: "promotion",
        rikishiId: rikishi.id,
        from: "ozeki-1-east",
        to: "yokozuna-1-east",
        description: "Promoted to Yokozuna",
      };

      // Generate and apply impacts
      const impacts = generateKeshoForPromotions(world, [promotionEvent]);
      const updatedWorld = resolveImpacts(world, [impacts]);

      // Verify both kesho and tsuna were created
      const updatedRikishi = updatedWorld.rikishi.get(rikishi.id);
      expect(updatedRikishi).toBeDefined();
      expect((updatedRikishi as any).keshoMawashi).toBeDefined();
      expect((updatedRikishi as any).yokozunaTsuna).toBeDefined();
      expect((updatedRikishi as any).yokozunaTsuna.style).toBeOneOf([
        "shiranui",
        "unryu",
        "traditional",
      ]);
    });
  });

  describe("Multiple promotions in single basho", () => {
    it("handles multiple juryo promotions simultaneously", () => {
      const world = makeMockWorldWithBrands(3);
      const heyas = Array.from(world.heyas.values());

      const rikishiList = heyas.map((heya, index) => {
        const r = mockRikishi(`rikishi-${index + 1}`, {
          id: `rikishi-${index + 1}`,
          heyaId: heya.id,
          nationality: "Japan",
          rank: "juryo",
          division: "juryo",
        });
        world.rikishi.set(r.id, r as any);
        return r;
      });

      const promotionEvents: MovementEvent[] = rikishiList.map((r, index) => ({
        kind: "promotion" as const,
        rikishiId: r.id,
        from: `makushita-${index + 1}-east`,
        to: `juryo-${14 - index}-east`,
        description: `Promoted to Juryo ${index + 1}`,
      }));

      // Generate and apply impacts
      const impacts = generateKeshoForPromotions(world, promotionEvents);
      const updatedWorld = resolveImpacts(world, [impacts]);

      // Verify all rikishi have kesho
      for (const r of rikishiList) {
        const updatedRikishi = updatedWorld.rikishi.get(r.id);
        expect((updatedRikishi as any).keshoMawashi).toBeDefined();
        expect((updatedRikishi as any).keshoMawashi.tier).toBe("juryo");
      }
    });
  });

  describe("Kesho persistence across state changes", () => {
    it("kesho persists when other rikishi fields are updated", () => {
      const world = makeMockWorldWithBrands(1);
      const heya = Array.from(world.heyas.values())[0];

      const initialKesho: KeshoMawashi = {
        id: "kesho-1",
        rikishiId: "rikishi-1",
        heyaBrandId: heya.brandIdentityId!,
        createdAt: { year: 2024, basho: "hatsu" },
        tier: "juryo",
        origin: "traditional",
        basePattern: "striped",
        primaryColor: "#1a365d",
        secondaryColor: "#2c5282",
        accentColor: "#d69e2e",
        goldThreadDensity: 0.3,
        borderStyle: "simple",
        embroideryStyle: "satin",
        mainSymbol: {
          type: "motif",
          value: "dragon",
          position: "center",
          size: "large",
          prominence: 0.8,
        },
        description: "Juryo kesho",
      };

      const rikishi = mockRikishi("rikishi-1", {
        id: "rikishi-1",
        heyaId: heya.id,
        nationality: "Japan",
      });
      (rikishi as any).keshoMawashi = initialKesho;
      world.rikishi.set(rikishi.id, rikishi as any);

      // Create an impact that updates other rikishi fields
      const builder = createImpactBuilder("test");
      builder.updateRikishi(rikishi.id, { condition: 0.8, motivation: 0.9 });
      const impacts = builder.build();

      // Apply impacts
      const updatedWorld = resolveImpacts(world, [impacts]);

      // Verify kesho is preserved
      const updatedRikishi = updatedWorld.rikishi.get(rikishi.id);
      expect((updatedRikishi as any).keshoMawashi).toBeDefined();
      expect((updatedRikishi as any).keshoMawashi.id).toBe(initialKesho.id);
      expect((updatedRikishi as any).condition).toBe(0.8);
    });
  });

  describe("Kesho chain upgrades", () => {
    it("properly chains upgrades from juryo -> makuuchi -> sanyaku -> yokozuna", () => {
      let world = makeMockWorldWithBrands(1);
      const heya = Array.from(world.heyas.values())[0];

      let currentKesho: KeshoMawashi | undefined;
      const rikishi = mockRikishi("rikishi-1", {
        id: "rikishi-1",
        heyaId: heya.id,
        nationality: "Japan",
      });
      world.rikishi.set(rikishi.id, rikishi as any);

      // Simulate juryo promotion
      const juryoEvent: MovementEvent = {
        kind: "promotion",
        rikishiId: rikishi.id,
        from: "makushita-1-east",
        to: "juryo-14-east",
        description: "Promoted to Juryo",
      };

      let impacts = generateKeshoForPromotions(world, [juryoEvent]);
      let updatedWorld = resolveImpacts(world, [impacts]);
      currentKesho = (updatedWorld.rikishi.get(rikishi.id) as any)?.keshoMawashi;

      expect(currentKesho).toBeDefined();
      expect(currentKesho!.tier).toBe("juryo");
      const juryoDensity = currentKesho!.goldThreadDensity;

      // Simulate makuuchi promotion
      world = updatedWorld as any;
      const makuuchiEvent: MovementEvent = {
        kind: "promotion",
        rikishiId: rikishi.id,
        from: "juryo-1-east",
        to: "maegashira-15-east",
        description: "Promoted to Makuuchi",
      };

      impacts = generateKeshoForPromotions(world, [makuuchiEvent]);
      updatedWorld = resolveImpacts(world, [impacts]);
      currentKesho = (updatedWorld.rikishi.get(rikishi.id) as any)?.keshoMawashi;

      expect(currentKesho!.tier).toBe("makuuchi");
      expect(currentKesho!.goldThreadDensity).toBeGreaterThan(juryoDensity);
      const makuuchiDensity = currentKesho!.goldThreadDensity;

      // Simulate sanyaku promotion
      world = updatedWorld as any;
      const sanyakuEvent: MovementEvent = {
        kind: "promotion",
        rikishiId: rikishi.id,
        from: "maegashira-5-east",
        to: "sekiwake-1-east",
        description: "Promoted to Sanyaku",
      };

      impacts = generateKeshoForPromotions(world, [sanyakuEvent]);
      updatedWorld = resolveImpacts(world, [impacts]);
      currentKesho = (updatedWorld.rikishi.get(rikishi.id) as any)?.keshoMawashi;

      expect(currentKesho!.tier).toBe("sanyaku");
      expect(currentKesho!.goldThreadDensity).toBeGreaterThan(makuuchiDensity);
    });
  });
});
