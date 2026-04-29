import { describe, it, expect } from "vitest";
import {
  ImpactBuilder,
  createImpactBuilder,
  updateHeyaImpact,
  updateRikishiImpact,
  retireRikishiImpact,
  logEventImpact,
  updateWorldFieldImpact,
} from "../ImpactBuilder";

describe("ImpactBuilder", () => {
  describe("createImpactBuilder", () => {
    it("should return an instance of ImpactBuilder", () => {
      const builder = createImpactBuilder("test-source");
      expect(builder).toBeInstanceOf(ImpactBuilder);
    });

    it("should initialize with the correct source and a timestamp", () => {
      const source = "test-source";
      const before = Date.now();
      const builder = createImpactBuilder(source);
      const impact = builder.build();
      const after = Date.now();

      expect(impact.metadata?.source).toBe(source);
      expect(impact.metadata?.timestamp).toBeGreaterThanOrEqual(before);
      expect(impact.metadata?.timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe("Entity Updates", () => {
    it("should add heya updates", () => {
      const builder = createImpactBuilder("test");
      builder.updateHeya("h1", { funds: 1000 } as any);
      const impact = builder.build();

      expect(impact.entities?.heyaUpdates?.get("h1")).toEqual({ funds: 1000 });
    });

    it("should merge multiple heya updates for the same id", () => {
      const builder = createImpactBuilder("test");
      builder.updateHeya("h1", { funds: 1000 } as any);
      builder.updateHeya("h1", { prestige: 50 } as any);
      const impact = builder.build();

      expect(impact.entities?.heyaUpdates?.get("h1")).toEqual({ funds: 1000, prestige: 50 });
    });

    it("should add rikishi updates", () => {
      const builder = createImpactBuilder("test");
      builder.updateRikishi("r1", { power: 60 } as any);
      const impact = builder.build();

      expect(impact.entities?.rikishiUpdates?.get("r1")).toEqual({ power: 60 });
    });

    it("should deep merge multiple rikishi updates for the same id", () => {
      const builder = createImpactBuilder("test");
      builder.updateRikishi("r1", { stats: { power: 60 } } as any);
      builder.updateRikishi("r1", { stats: { technique: 70 } } as any);
      const impact = builder.build();

      expect(impact.entities?.rikishiUpdates?.get("r1")).toEqual({
        stats: { power: 60, technique: 70 },
      });
    });

    it("should update rikishi nested fields", () => {
      const builder = createImpactBuilder("test");
      builder.updateRikishiNestedField("r1", "stats.power", 65);
      builder.updateRikishiNestedField("r1", "h2h.opponent1", { wins: 5, losses: 2 });
      const impact = builder.build();

      expect(impact.entities?.rikishiUpdates?.get("r1")).toEqual({
        stats: { power: 65 },
        h2h: { opponent1: { wins: 5, losses: 2 } },
      });
    });

    it("should add oyakata updates", () => {
      const builder = createImpactBuilder("test");
      builder.updateOyakata("o1", { name: "New Name" } as any);
      const impact = builder.build();

      expect(impact.entities?.oyakataUpdates?.get("o1")).toEqual({ name: "New Name" });
    });

    it("should add sponsor updates", () => {
      const builder = createImpactBuilder("test");
      builder.updateSponsor("s1", { active: true });
      const impact = builder.build();

      expect(impact.entities?.sponsorUpdates?.get("s1")).toEqual({ active: true });
    });

    it("should add koenkai updates", () => {
      const builder = createImpactBuilder("test");
      builder.updateKoenkai("k1", { memberCount: 100 });
      const impact = builder.build();

      expect(impact.entities?.koenkaiUpdates?.get("k1")).toEqual({ memberCount: 100 });
    });
  });

  describe("Collection and Deletion Operations", () => {
    it("should add rikishi to collections", () => {
      const builder = createImpactBuilder("test");
      const rikishi = { id: "r1", name: "Rikishi 1" } as any;
      builder.addRikishi(rikishi);
      const impact = builder.build();

      expect(impact.collections?.rikishiToAdd).toContain(rikishi);
    });

    it("should remove rikishi from collections", () => {
      const builder = createImpactBuilder("test");
      builder.removeRikishi("r1");
      const impact = builder.build();

      expect(impact.collections?.rikishiToRemove).toContain("r1");
    });

    it("should retire rikishi", () => {
      const builder = createImpactBuilder("test");
      builder.retireRikishi("r1");
      const impact = builder.build();

      expect(impact.collections?.rikishiToHistorical).toContain("r1");
    });

    it("should unretire rikishi", () => {
      const builder = createImpactBuilder("test");
      builder.unretireRikishi("r1");
      const impact = builder.build();

      expect(impact.collections?.rikishiFromHistorical).toContain("r1");
    });

    it("should delete heya", () => {
      const builder = createImpactBuilder("test");
      builder.deleteHeya("h1");
      const impact = builder.build();

      expect(impact.deletedEntities?.heyaIds).toContain("h1");
    });
  });

  describe("World State and Event Logging", () => {
    it("should update world fields", () => {
      const builder = createImpactBuilder("test");
      builder.updateWorldField("week", 3);
      builder.updateWorldField("year", 2026);
      const impact = builder.build();

      expect(impact.worldFields?.week).toBe(3);
      expect(impact.worldFields?.year).toBe(2026);
    });

    it("should append to world arrays", () => {
      const builder = createImpactBuilder("test");
      builder.appendToWorldArray("history", ["item1", "item2"]);
      const impact = builder.build();

      expect(impact.arrayAppends).toEqual([{ field: "history", items: ["item1", "item2"] }]);
    });

    it("should log events", () => {
      const builder = createImpactBuilder("test");
      builder.logEvent("TRAINING_UPDATE" as any, "training", { foo: "bar" }, { heyaId: "h1" });
      const impact = builder.build();

      expect(impact.events?.[0]).toEqual({
        type: "TRAINING_UPDATE",
        category: "training",
        data: { foo: "bar" },
        heyaId: "h1",
        rikishiId: undefined,
        importance: undefined,
      });
    });

    it("should add custom metadata", () => {
      const builder = createImpactBuilder("test");
      builder.addMetadata("customKey", "customValue");
      const impact = builder.build();

      expect((impact.metadata as any).customKey).toBe("customValue");
    });
  });

  describe("Convenience Functions", () => {
    it("updateHeyaImpact creates correct impact", () => {
      const impact = updateHeyaImpact("h1", { funds: 500 } as any, "src");
      expect(impact.entities?.heyaUpdates?.get("h1")).toEqual({ funds: 500 });
      expect(impact.metadata?.source).toBe("src");
    });

    it("updateRikishiImpact creates correct impact", () => {
      const impact = updateRikishiImpact("r1", { power: 55 } as any, "src");
      expect(impact.entities?.rikishiUpdates?.get("r1")).toEqual({ power: 55 });
      expect(impact.metadata?.source).toBe("src");
    });

    it("retireRikishiImpact creates correct impact", () => {
      const impact = retireRikishiImpact("r1", "src");
      expect(impact.collections?.rikishiToHistorical).toContain("r1");
      expect(impact.metadata?.source).toBe("src");
    });

    it("logEventImpact creates correct impact", () => {
      const impact = logEventImpact("TRAINING_UPDATE" as any, "training", { x: 1 }, "src");
      expect(impact.events?.[0].type).toBe("TRAINING_UPDATE");
      expect(impact.metadata?.source).toBe("src");
    });

    it("updateWorldFieldImpact creates correct impact", () => {
      const impact = updateWorldFieldImpact("week", 4, "src");
      expect(impact.worldFields?.week).toBe(4);
      expect(impact.metadata?.source).toBe("src");
    });
  });
});
