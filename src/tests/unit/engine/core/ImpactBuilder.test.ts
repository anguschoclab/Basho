import { describe, it, expect } from "vitest";
import { ImpactBuilder, createImpactBuilder, updateRikishiImpact, retireRikishiImpact } from "../ImpactBuilder";

describe("ImpactBuilder", () => {
  describe("constructor and build", () => {
    it("should create an impact with source and timestamp", () => {
      const builder = new ImpactBuilder("test_source");
      const impact = builder.build();

      expect(impact.metadata?.source).toBe("test_source");
      expect(impact.metadata?.timestamp).toBeDefined();
    });

    it("should return the same impact on multiple build calls", () => {
      const builder = new ImpactBuilder("test_source");
      const impact1 = builder.build();
      const impact2 = builder.build();

      expect(impact1).toBe(impact2);
    });
  });

  describe("createImpactBuilder", () => {
    it("should create a new ImpactBuilder instance", () => {
      const builder = createImpactBuilder("test_source");

      expect(builder).toBeInstanceOf(ImpactBuilder);
    });

    it("should set the source in the builder", () => {
      const builder = createImpactBuilder("test_source");
      const impact = builder.build();

      expect(impact.metadata?.source).toBe("test_source");
    });
  });

  describe("updateWorldField", () => {
    it("should update a world field", () => {
      const builder = new ImpactBuilder("test_source");
      builder.updateWorldField("year", 2026);

      const impact = builder.build();
      expect(impact.worldFields?.year).toBe(2026);
    });

    it("should support method chaining", () => {
      const builder = new ImpactBuilder("test_source");
      const result = builder.updateWorldField("year", 2026);

      expect(result).toBe(builder);
    });

    it("should accumulate multiple world field updates", () => {
      const builder = new ImpactBuilder("test_source");
      builder.updateWorldField("year", 2026).updateWorldField("week", 2);

      const impact = builder.build();
      expect(impact.worldFields?.year).toBe(2026);
      expect(impact.worldFields?.week).toBe(2);
    });
  });

  describe("updateRikishi", () => {
    it("should add a rikishi update to the impact", () => {
      const builder = new ImpactBuilder("test_source");
      builder.updateRikishi("r1", { power: 85 } as any);

      const impact = builder.build();
      expect(impact.entities?.rikishiUpdates?.has("r1")).toBe(true);
      expect(impact.entities?.rikishiUpdates?.get("r1")).toEqual({ power: 85 });
    });

    it("should support method chaining", () => {
      const builder = new ImpactBuilder("test_source");
      const result = builder.updateRikishi("r1", { power: 85 } as any);

      expect(result).toBe(builder);
    });

    it("should merge multiple updates for the same rikishi", () => {
      const builder = new ImpactBuilder("test_source");
      builder.updateRikishi("r1", { power: 85 } as any).updateRikishi("r1", { technique: 90 } as any);

      const impact = builder.build();
      expect(impact.entities?.rikishiUpdates?.get("r1")).toEqual({ power: 85, technique: 90 });
    });

    it("should handle updates for different rikishi", () => {
      const builder = new ImpactBuilder("test_source");
      builder.updateRikishi("r1", { power: 85 } as any).updateRikishi("r2", { power: 80 } as any);

      const impact = builder.build();
      expect(impact.entities?.rikishiUpdates?.has("r1")).toBe(true);
      expect(impact.entities?.rikishiUpdates?.has("r2")).toBe(true);
    });
  });

  describe("updateHeya", () => {
    it("should add a heya update to the impact", () => {
      const builder = new ImpactBuilder("test_source");
      builder.updateHeya("h1", { funds: 1000 } as any);

      const impact = builder.build();
      expect(impact.entities?.heyaUpdates?.has("h1")).toBe(true);
      expect(impact.entities?.heyaUpdates?.get("h1")).toEqual({ funds: 1000 });
    });

    it("should support method chaining", () => {
      const builder = new ImpactBuilder("test_source");
      const result = builder.updateHeya("h1", { funds: 1000 } as any);

      expect(result).toBe(builder);
    });

    it("should merge multiple updates for the same heya", () => {
      const builder = new ImpactBuilder("test_source");
      builder.updateHeya("h1", { funds: 1000 } as any).updateHeya("h1", { reputation: 75 } as any);

      const impact = builder.build();
      expect(impact.entities?.heyaUpdates?.get("h1")).toEqual({ funds: 1000, reputation: 75 });
    });
  });

  describe("logEvent", () => {
    it("should add an event to the impact", () => {
      const builder = new ImpactBuilder("test_source");
      builder.logEvent("TEST_EVENT" as any, "test" as any, { message: "test" });

      const impact = builder.build();
      expect(impact.events?.length).toBe(1);
      expect(impact.events?.[0].type).toBe("TEST_EVENT");
      expect(impact.events?.[0].category).toBe("test");
      expect(impact.events?.[0].data).toEqual({ message: "test" });
    });

    it("should support method chaining", () => {
      const builder = new ImpactBuilder("test_source");
      const result = builder.logEvent("TEST_EVENT" as any, "test" as any, {});

      expect(result).toBe(builder);
    });

    it("should accumulate multiple events", () => {
      const builder = new ImpactBuilder("test_source");
      builder.logEvent("EVENT_1" as any, "test" as any, {}).logEvent("EVENT_2" as any, "test" as any, {});

      const impact = builder.build();
      expect(impact.events?.length).toBe(2);
    });

    it("should support optional heyaId and rikishiId", () => {
      const builder = new ImpactBuilder("test_source");
      builder.logEvent("TEST_EVENT" as any, "test" as any, {}, { heyaId: "h1", rikishiId: "r1" });

      const impact = builder.build();
      expect(impact.events?.[0].heyaId).toBe("h1");
      expect(impact.events?.[0].rikishiId).toBe("r1");
    });
  });

  describe("merge", () => {
    it("should merge another StateImpact into the builder", () => {
      const builder = new ImpactBuilder("test_source");
      const otherImpact = {
        entities: {
          rikishiUpdates: new Map([["r1", { power: 85 } as any]]),
        },
        metadata: { source: "other" },
      };

      builder.merge(otherImpact as any);

      const impact = builder.build();
      expect(impact.entities?.rikishiUpdates?.has("r1")).toBe(true);
    });

    it("should support method chaining", () => {
      const builder = new ImpactBuilder("test_source");
      const otherImpact = {
        entities: { rikishiUpdates: new Map() },
        metadata: { source: "other" },
      };

      const result = builder.merge(otherImpact as any);

      expect(result).toBe(builder);
    });

    it("should merge rikishi updates", () => {
      const builder = new ImpactBuilder("test_source");
      const otherImpact = {
        entities: {
          rikishiUpdates: new Map([["r1", { power: 85 } as any]]),
        },
        metadata: { source: "other" },
      };

      builder.merge(otherImpact as any);

      const impact = builder.build();
      expect(impact.entities?.rikishiUpdates?.get("r1")).toEqual({ power: 85 });
    });

    it("should merge heya updates", () => {
      const builder = new ImpactBuilder("test_source");
      const otherImpact = {
        entities: {
          heyaUpdates: new Map([["h1", { funds: 1000 } as any]]),
        },
        metadata: { source: "other" },
      };

      builder.merge(otherImpact as any);

      const impact = builder.build();
      expect(impact.entities?.heyaUpdates?.get("h1")).toEqual({ funds: 1000 });
    });
  });

  describe("retireRikishi", () => {
    it("should add rikishi to historical and set retirement metadata", () => {
      const builder = new ImpactBuilder("test_source");
      builder.retireRikishi("r1", 2026, "Retirement");

      const impact = builder.build();
      expect(impact.collections?.rikishiToHistorical).toContain("r1");
      expect(impact.collections?.activeRikishiIdsToRemove).toContain("r1");
      expect(impact.entities?.rikishiUpdates?.get("r1")).toEqual({
        isRetired: true,
        retirementYear: 2026,
        retirementReason: "Retirement",
      });
    });

    it("should support method chaining", () => {
      const builder = new ImpactBuilder("test_source");
      const result = builder.retireRikishi("r1");

      expect(result).toBe(builder);
    });

    it("should use default year and reason if not provided", () => {
      const builder = new ImpactBuilder("test_source");
      builder.retireRikishi("r1");

      const impact = builder.build();
      expect(impact.entities?.rikishiUpdates?.get("r1")).toEqual({
        isRetired: true,
        retirementYear: 2026,
        retirementReason: "Retirement",
      });
    });
  });

  describe("updateRikishiNestedField", () => {
    it("should update a nested field in a rikishi", () => {
      const builder = new ImpactBuilder("test_source");
      builder.updateRikishiNestedField("r1", "currentInjury", { type: "test" });

      const impact = builder.build();
      expect(impact.entities?.rikishiUpdates?.get("r1")).toEqual({
        currentInjury: { type: "test" },
      });
    });

    it("should support method chaining", () => {
      const builder = new ImpactBuilder("test_source");
      const result = builder.updateRikishiNestedField("r1", "field", "value");

      expect(result).toBe(builder);
    });

    it("should handle deep nested paths", () => {
      const builder = new ImpactBuilder("test_source");
      builder.updateRikishiNestedField("r1", "h2h.opponent1", { wins: 5 });

      const impact = builder.build();
      expect(impact.entities?.rikishiUpdates?.get("r1")).toEqual({
        h2h: { opponent1: { wins: 5 } },
      });
    });
  });

  describe("addStaff", () => {
    it("should add a staff member to the impact", () => {
      const builder = new ImpactBuilder("test_source");
      builder.addStaff({ id: "s1", role: "trainer" } as any);

      const impact = builder.build();
      expect(impact.collections?.staffToAdd).toHaveLength(1);
      expect(impact.collections?.staffToAdd?.[0]).toEqual({ id: "s1", role: "trainer" });
    });

    it("should support method chaining", () => {
      const builder = new ImpactBuilder("test_source");
      const result = builder.addStaff({ id: "s1" } as any);

      expect(result).toBe(builder);
    });

    it("should accumulate multiple staff additions", () => {
      const builder = new ImpactBuilder("test_source");
      builder.addStaff({ id: "s1" } as any).addStaff({ id: "s2" } as any);

      const impact = builder.build();
      expect(impact.collections?.staffToAdd).toHaveLength(2);
    });
  });

  describe("removeStaff", () => {
    it("should add a staff ID to remove", () => {
      const builder = new ImpactBuilder("test_source");
      builder.removeStaff("s1");

      const impact = builder.build();
      expect(impact.collections?.staffToRemove).toContain("s1");
    });

    it("should support method chaining", () => {
      const builder = new ImpactBuilder("test_source");
      const result = builder.removeStaff("s1");

      expect(result).toBe(builder);
    });

    it("should accumulate multiple staff removals", () => {
      const builder = new ImpactBuilder("test_source");
      builder.removeStaff("s1").removeStaff("s2");

      const impact = builder.build();
      expect(impact.collections?.staffToRemove).toHaveLength(2);
    });
  });

  describe("updateSponsor", () => {
    it("should add a sponsor update to the impact", () => {
      const builder = new ImpactBuilder("test_source");
      builder.updateSponsor("s1", { active: true });

      const impact = builder.build();
      expect(impact.entities?.sponsorUpdates?.has("s1")).toBe(true);
      expect(impact.entities?.sponsorUpdates?.get("s1")).toEqual({ active: true });
    });

    it("should support method chaining", () => {
      const builder = new ImpactBuilder("test_source");
      const result = builder.updateSponsor("s1", {});

      expect(result).toBe(builder);
    });
  });

  describe("updateKoenkai", () => {
    it("should add a koenkai update to the impact", () => {
      const builder = new ImpactBuilder("test_source");
      builder.updateKoenkai("k1", { active: true });

      const impact = builder.build();
      expect(impact.entities?.koenkaiUpdates?.has("k1")).toBe(true);
      expect(impact.entities?.koenkaiUpdates?.get("k1")).toEqual({ active: true });
    });

    it("should support method chaining", () => {
      const builder = new ImpactBuilder("test_source");
      const result = builder.updateKoenkai("k1", {});

      expect(result).toBe(builder);
    });
  });

  describe("updateMyosekiStock", () => {
    it("should add a myoseki stock update to the impact", () => {
      const builder = new ImpactBuilder("test_source");
      builder.updateMyosekiStock("m1", { price: 1000 } as any);

      const impact = builder.build();
      expect(impact.entities?.myosekiUpdates?.has("m1")).toBe(true);
      expect(impact.entities?.myosekiUpdates?.get("m1")).toEqual({ price: 1000 });
    });

    it("should support method chaining", () => {
      const builder = new ImpactBuilder("test_source");
      const result = builder.updateMyosekiStock("m1", {} as any);

      expect(result).toBe(builder);
    });
  });

  describe("appendToWorldArray", () => {
    it("should append items to a world array", () => {
      const builder = new ImpactBuilder("test_source");
      builder.appendToWorldArray("history", [{ basho: "hatsu" } as any]);

      const impact = builder.build();
      expect(impact.arrayAppends).toHaveLength(1);
      expect(impact.arrayAppends?.[0].field).toBe("history");
      expect(impact.arrayAppends?.[0].items).toEqual([{ basho: "hatsu" }]);
    });

    it("should support method chaining", () => {
      const builder = new ImpactBuilder("test_source");
      const result = builder.appendToWorldArray("history", []);

      expect(result).toBe(builder);
    });

    it("should accumulate multiple array appends", () => {
      const builder = new ImpactBuilder("test_source");
      builder.appendToWorldArray("history", [{ basho: "hatsu" } as any]).appendToWorldArray("history", [{ basho: "haru" } as any]);

      const impact = builder.build();
      expect(impact.arrayAppends).toHaveLength(2);
    });
  });

  describe("recordMyosekiTransaction", () => {
    it("should add a myoseki transaction to the history", () => {
      const builder = new ImpactBuilder("test_source");
      builder.recordMyosekiTransaction({ type: "buy", price: 1000 } as any);

      const impact = builder.build();
      expect(impact.arrayAppends).toHaveLength(1);
      expect(impact.arrayAppends?.[0].field).toBe("myosekiMarket.history");
      expect(impact.arrayAppends?.[0].items).toEqual([{ type: "buy", price: 1000 }]);
    });

    it("should support method chaining", () => {
      const builder = new ImpactBuilder("test_source");
      const result = builder.recordMyosekiTransaction({} as any);

      expect(result).toBe(builder);
    });
  });

  describe("updateOyakata", () => {
    it("should add an oyakata update to the impact", () => {
      const builder = new ImpactBuilder("test_source");
      builder.updateOyakata("o1", { name: "Test" } as any);

      const impact = builder.build();
      expect(impact.entities?.oyakataUpdates?.has("o1")).toBe(true);
      expect(impact.entities?.oyakataUpdates?.get("o1")).toEqual({ name: "Test" });
    });

    it("should support method chaining", () => {
      const builder = new ImpactBuilder("test_source");
      const result = builder.updateOyakata("o1", {} as any);

      expect(result).toBe(builder);
    });
  });

  describe("updateTrainingState", () => {
    it("should add a training state update to the impact", () => {
      const builder = new ImpactBuilder("test_source");
      builder.updateTrainingState("h1", { focus: "power" } as any);

      const impact = builder.build();
      expect(impact.entities?.trainingStateUpdates?.has("h1")).toBe(true);
      expect(impact.entities?.trainingStateUpdates?.get("h1")).toEqual({ focus: "power" });
    });

    it("should support method chaining", () => {
      const builder = new ImpactBuilder("test_source");
      const result = builder.updateTrainingState("h1", {} as any);

      expect(result).toBe(builder);
    });
  });

  describe("updateStaff", () => {
    it("should add a staff update to the impact", () => {
      const builder = new ImpactBuilder("test_source");
      builder.updateStaff("s1", { role: "trainer" } as any);

      const impact = builder.build();
      expect(impact.entities?.staffUpdates?.has("s1")).toBe(true);
      expect(impact.entities?.staffUpdates?.get("s1")).toEqual({ role: "trainer" });
    });

    it("should support method chaining", () => {
      const builder = new ImpactBuilder("test_source");
      const result = builder.updateStaff("s1", {} as any);

      expect(result).toBe(builder);
    });
  });

  describe("addOyakata", () => {
    it("should add an oyakata to the impact", () => {
      const builder = new ImpactBuilder("test_source");
      builder.addOyakata({ id: "o1", name: "Test" } as any);

      const impact = builder.build();
      expect(impact.collections?.oyakataToAdd).toHaveLength(1);
      expect(impact.collections?.oyakataToAdd?.[0]).toEqual({ id: "o1", name: "Test" });
    });

    it("should support method chaining", () => {
      const builder = new ImpactBuilder("test_source");
      const result = builder.addOyakata({ id: "o1" } as any);

      expect(result).toBe(builder);
    });
  });

  describe("removeOyakata", () => {
    it("should add an oyakata ID to remove", () => {
      const builder = new ImpactBuilder("test_source");
      builder.removeOyakata("o1");

      const impact = builder.build();
      expect(impact.collections?.oyakataToRemove).toContain("o1");
    });

    it("should support method chaining", () => {
      const builder = new ImpactBuilder("test_source");
      const result = builder.removeOyakata("o1");

      expect(result).toBe(builder);
    });
  });

  describe("addRikishi", () => {
    it("should add a rikishi to the impact and active IDs", () => {
      const builder = new ImpactBuilder("test_source");
      builder.addRikishi({ id: "r1", shikona: "Test" } as any);

      const impact = builder.build();
      expect(impact.collections?.rikishiToAdd).toHaveLength(1);
      expect(impact.collections?.rikishiToAdd?.[0]).toEqual({ id: "r1", shikona: "Test" });
      expect(impact.collections?.activeRikishiIdsToAdd).toContain("r1");
    });

    it("should support method chaining", () => {
      const builder = new ImpactBuilder("test_source");
      const result = builder.addRikishi({ id: "r1" } as any);

      expect(result).toBe(builder);
    });
  });

  describe("removeRikishi", () => {
    it("should add a rikishi ID to remove and remove from active IDs", () => {
      const builder = new ImpactBuilder("test_source");
      builder.removeRikishi("r1");

      const impact = builder.build();
      expect(impact.collections?.rikishiToRemove).toContain("r1");
      expect(impact.collections?.activeRikishiIdsToRemove).toContain("r1");
    });

    it("should support method chaining", () => {
      const builder = new ImpactBuilder("test_source");
      const result = builder.removeRikishi("r1");

      expect(result).toBe(builder);
    });
  });

  describe("unretireRikishi", () => {
    it("should move rikishi from historical to active", () => {
      const builder = new ImpactBuilder("test_source");
      builder.unretireRikishi("r1");

      const impact = builder.build();
      expect(impact.collections?.rikishiFromHistorical).toContain("r1");
      expect(impact.collections?.activeRikishiIdsToAdd).toContain("r1");
    });

    it("should support method chaining", () => {
      const builder = new ImpactBuilder("test_source");
      const result = builder.unretireRikishi("r1");

      expect(result).toBe(builder);
    });
  });

  describe("deleteHeya", () => {
    it("should add a heya ID to delete", () => {
      const builder = new ImpactBuilder("test_source");
      builder.deleteHeya("h1");

      const impact = builder.build();
      expect(impact.deletedEntities?.heyaIds).toContain("h1");
    });

    it("should support method chaining", () => {
      const builder = new ImpactBuilder("test_source");
      const result = builder.deleteHeya("h1");

      expect(result).toBe(builder);
    });
  });

  describe("updateTrainingStateNestedField", () => {
    it("should update a nested field in a training state", () => {
      const builder = new ImpactBuilder("test_source");
      builder.updateTrainingStateNestedField("h1", "focus", "power");

      const impact = builder.build();
      expect(impact.entities?.trainingStateUpdates?.get("h1")).toEqual({
        focus: "power",
      });
    });

    it("should support method chaining", () => {
      const builder = new ImpactBuilder("test_source");
      const result = builder.updateTrainingStateNestedField("h1", "field", "value");

      expect(result).toBe(builder);
    });
  });

  describe("addMetadata", () => {
    it("should add custom metadata to the impact", () => {
      const builder = new ImpactBuilder("test_source");
      builder.addMetadata("customKey", "customValue");

      const impact = builder.build();
      expect(impact.metadata?.customKey).toBe("customValue");
    });

    it("should support method chaining", () => {
      const builder = new ImpactBuilder("test_source");
      const result = builder.addMetadata("key", "value");

      expect(result).toBe(builder);
    });
  });
});

describe("ImpactBuilder - Convenience Functions", () => {
  describe("updateRikishiImpact", () => {
    it("should create an impact to update a rikishi with the given properties", () => {
      const id = "test-rikishi-1";
      const update = { power: 85, technique: 90 };
      const source = "test_source";

      const impact = updateRikishiImpact(id, update as any, source);

      expect(impact.entities?.rikishiUpdates?.has(id)).toBe(true);
      expect(impact.entities?.rikishiUpdates?.get(id)).toEqual(update);
      expect(impact.metadata?.source).toBe(source);
      expect(impact.metadata?.timestamp).toBeDefined();
    });

    it("should handle empty updates", () => {
      const id = "test-rikishi-2";
      const update = {};
      const source = "empty_update_test";

      const impact = updateRikishiImpact(id, update, source);

      expect(impact.entities?.rikishiUpdates?.has(id)).toBe(true);
      expect(impact.entities?.rikishiUpdates?.get(id)).toEqual({});
      expect(impact.metadata?.source).toBe(source);
    });
  });

  describe("retireRikishiImpact", () => {
    it("should create a retirement impact", () => {
      const id = "test-rikishi-1";
      const year = 2026;
      const reason = "Retirement";
      const source = "test_source";

      const impact = retireRikishiImpact(id, year, reason, source);

      expect(impact.collections?.rikishiToHistorical).toContain(id);
      expect(impact.collections?.activeRikishiIdsToRemove).toContain(id);
      expect(impact.entities?.rikishiUpdates?.get(id)).toEqual({
        isRetired: true,
        retirementYear: year,
        retirementReason: reason,
      });
      expect(impact.metadata?.source).toBe(source);
    });
  });
});
