/**
 * ImpactBuilder Unit Tests
 */

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
import type { StateImpact } from "../StateImpact";
import type { Rikishi } from "../../types/rikishi";

describe("ImpactBuilder", () => {
  describe("Class Methods", () => {
    it("creates an empty impact with a source", () => {
      const builder = new ImpactBuilder("test-source");
      const impact = builder.build();

      expect(impact.metadata?.source).toBe("test-source");
      expect(impact.metadata?.timestamp).toBeDefined();
      expect(impact.entities).toBeUndefined();
    });

    it("updates heya entities", () => {
      const builder = new ImpactBuilder("test");
      builder.updateHeya("heya-1", { funds: 1000 });
      builder.updateHeya("heya-1", { reputation: 50 });
      builder.updateHeya("heya-2", { funds: 500 });

      const impact = builder.build();
      expect(impact.entities?.heyaUpdates?.size).toBe(2);
      expect(impact.entities?.heyaUpdates?.get("heya-1")).toEqual({ funds: 1000, reputation: 50 });
      expect(impact.entities?.heyaUpdates?.get("heya-2")).toEqual({ funds: 500 });
    });

    it("updates rikishi entities", () => {
      const builder = new ImpactBuilder("test");
      builder.updateRikishi("r-1", { power: 60 });
      builder.updateRikishi("r-1", { speed: 55 });

      const impact = builder.build();
      expect(impact.entities?.rikishiUpdates?.size).toBe(1);
      expect(impact.entities?.rikishiUpdates?.get("r-1")).toEqual({ power: 60, speed: 55 });
    });

    it("adds rikishi to collections", () => {
      const builder = new ImpactBuilder("test");
      const r1 = { id: "r-1", shikona: "Test1" } as Rikishi;
      const r2 = { id: "r-2", shikona: "Test2" } as Rikishi;

      builder.addRikishi(r1);
      builder.addRikishi(r2);

      const impact = builder.build();
      expect(impact.collections?.rikishiToAdd).toEqual([r1, r2]);
    });

    it("removes rikishi", () => {
      const builder = new ImpactBuilder("test");
      builder.removeRikishi("r-1");

      const impact = builder.build();
      expect(impact.collections?.rikishiToRemove).toEqual(["r-1"]);
    });

    it("retires rikishi", () => {
      const builder = new ImpactBuilder("test");
      builder.retireRikishi("r-1", 2026, "Injury");

      const impact = builder.build();
      expect(impact.entities?.rikishiUpdates?.get("r-1")).toEqual({
        isRetired: true,
        retirementYear: 2026,
        retirementReason: "Injury",
      });
      expect(impact.collections?.rikishiToHistorical).toEqual(["r-1"]);
    });

    it("unretires rikishi", () => {
      const builder = new ImpactBuilder("test");
      builder.unretireRikishi("r-1");

      const impact = builder.build();
      expect(impact.collections?.rikishiFromHistorical).toEqual(["r-1"]);
    });

    it("deletes heya", () => {
      const builder = new ImpactBuilder("test");
      builder.deleteHeya("heya-1");

      const impact = builder.build();
      expect(impact.deletedEntities?.heyaIds).toEqual(["heya-1"]);
    });

    it("updates world fields", () => {
      const builder = new ImpactBuilder("test");
      builder.updateWorldField("year", 2027);
      builder.updateWorldField("week", 3);

      const impact = builder.build();
      expect(impact.worldFields?.year).toBe(2027);
      expect(impact.worldFields?.week).toBe(3);
    });

    it("appends to world arrays", () => {
      const builder = new ImpactBuilder("test");
      builder.appendToWorldArray("history", [{ bashoId: "b-1" } as any]);

      const impact = builder.build();
      expect(impact.arrayAppends).toHaveLength(1);
      expect(impact.arrayAppends?.[0]).toEqual({
        field: "history",
        items: [{ bashoId: "b-1" }],
      });
    });

    it("logs events", () => {
      const builder = new ImpactBuilder("test");
      builder.logEvent("TRAINING_UPDATE" as any, "training" as any, { someData: true } as any, { heyaId: "h-1", importance: "normal" as any });

      const impact = builder.build();
      expect(impact.events).toHaveLength(1);
      expect(impact.events?.[0]).toEqual({
        type: "TRAINING_UPDATE",
        category: "training",
        data: { someData: true },
        heyaId: "h-1",
        rikishiId: undefined,
        importance: "normal",
      });
    });

    it("adds metadata", () => {
      const builder = new ImpactBuilder("test");
      builder.addMetadata("customKey", "customValue");

      const impact = builder.build();
      expect((impact.metadata as any)?.customKey).toBe("customValue");
    });

    it("merges another impact into the builder", () => {
      const builder = new ImpactBuilder("main");
      builder.updateHeya("h-1", { funds: 100 });
      builder.updateWorldField("year", 2025);

      const otherImpact: StateImpact = {
        entities: {
          heyaUpdates: new Map([["h-1", { reputation: 10 }]]),
          rikishiUpdates: new Map([["r-1", { power: 50 }]]),
        },
        worldFields: {
          week: 2,
        },
        metadata: { source: "other" },
      };

      builder.merge(otherImpact);

      const finalImpact = builder.build();
      expect(finalImpact.entities?.heyaUpdates?.get("h-1")).toEqual({ funds: 100, reputation: 10 });
      expect(finalImpact.entities?.rikishiUpdates?.get("r-1")).toEqual({ power: 50 });
      expect(finalImpact.worldFields?.year).toBe(2025);
      expect(finalImpact.worldFields?.week).toBe(2);
    });
  });

  describe("Convenience Functions", () => {
    it("createImpactBuilder creates a new builder", () => {
      const builder = createImpactBuilder("test");
      expect(builder).toBeInstanceOf(ImpactBuilder);
      expect(builder.build().metadata?.source).toBe("test");
    });

    it("updateHeyaImpact creates a heya update impact directly", () => {
      const impact = updateHeyaImpact("h-1", { funds: 200 }, "test");
      expect(impact.entities?.heyaUpdates?.get("h-1")).toEqual({ funds: 200 });
      expect(impact.metadata?.source).toBe("test");
    });

    it("updateRikishiImpact creates a rikishi update impact directly", () => {
      const impact = updateRikishiImpact("r-1", { power: 75 }, "test");
      expect(impact.entities?.rikishiUpdates?.get("r-1")).toEqual({ power: 75 });
      expect(impact.metadata?.source).toBe("test");
    });

    it("retireRikishiImpact creates a retirement impact directly", () => {
      const impact = retireRikishiImpact("r-1", 2028, "Old Age", "test");
      expect(impact.entities?.rikishiUpdates?.get("r-1")).toEqual({
        isRetired: true,
        retirementYear: 2028,
        retirementReason: "Old Age",
      });
      expect(impact.collections?.rikishiToHistorical).toEqual(["r-1"]);
      expect(impact.metadata?.source).toBe("test");
    });

    it("logEventImpact creates an event logging impact directly", () => {
      const impact = logEventImpact("TRAINING_UPDATE" as any, "training" as any, { d: 1 } as any, "test", { heyaId: "h-1" });
      expect(impact.events).toHaveLength(1);
      expect(impact.events?.[0]).toEqual({
        type: "TRAINING_UPDATE",
        category: "training",
        data: { d: 1 },
        heyaId: "h-1",
        rikishiId: undefined,
        importance: undefined,
      });
      expect(impact.metadata?.source).toBe("test");
    });

    it("updateWorldFieldImpact creates a world field update directly", () => {
      const impact = updateWorldFieldImpact("year", 2030, "test");
      expect(impact.worldFields?.year).toBe(2030);
      expect(impact.metadata?.source).toBe("test");
    });
  });
});
