/**
 * ImpactResolver Unit Tests
 */

import { describe, it, expect, beforeEach } from "vitest";
import * as ImpactResolver from "@/engine/core/ImpactResolver";
import type { WorldState } from "@/engine/types/world";
import type { StateImpact } from "@/engine/core/StateImpact";
import type { Heya } from "@/engine/types/heya";
import { mockRikishi } from "../utils";

describe("ImpactResolver", () => {
  let world: WorldState;

  beforeEach(() => {
    world = {
      id: "world-1",
      seed: "test-seed",
      year: 2025,
      week: 1,
      dayIndexGlobal: 0,
      cyclePhase: "interim",
      heyas: new Map(),
      rikishi: new Map(),
      historicalRikishi: new Map(),
      activeRikishiIds: new Set(),
      oyakata: new Map(),
      events: { version: "1.0.0", log: [], dedupe: {} },
      history: [],
      ftue: {} as any,
      calendar: { month: 1, currentWeek: 1, currentDay: 1 },
      records: {} as any,
      settings: { archiveMode: "standard" },
    } as unknown as WorldState;
  });

  describe("resolveImpacts", () => {
    it("returns world unchanged when impacts array is empty", () => {
      const result = ImpactResolver.resolveImpacts(world, []);
      expect(result).toBe(world);
    });

    it("applies heya entity updates", () => {
      const heya: Heya = {
        id: "heya-1",
        name: "Test Heya",
        funds: 1000,
        reputation: 50,
        prestigeBand: "unknown",
        statureBand: "new",
        oyakataId: "oyakata-1",
        isActive: true,
        facilities: { level: 1, condition: 100 },
        fanbase: 100,
        monthlyExpenses: 1000,
        rikishiIds: [],
      } as any;
      world.heyas.set(heya.id, heya);

      const impact: StateImpact = {
        entities: {
          heyaUpdates: new Map([["heya-1", { funds: 2000, reputation: 75 }]]),
        },
        metadata: { source: "test" },
      };

      const result = ImpactResolver.resolveImpacts(world, [impact]);
      expect(result.heyas.get("heya-1")?.funds).toBe(2000);
      expect(result.heyas.get("heya-1")?.reputation).toBe(75);
      expect(result.heyas.get("heya-1")?.name).toBe("Test Heya"); // Unchanged
    });

    it("applies rikishi entity updates", () => {
      const rikishi = mockRikishi("r1", { shikona: "Test", power: 50 } as never);
      world.rikishi.set(rikishi.id, rikishi);

      const impact: StateImpact = {
        entities: {
          rikishiUpdates: new Map([["r1", { power: 60, speed: 55 } as never]]),
        },
        metadata: { source: "test" },
      };

      const result = ImpactResolver.resolveImpacts(world, [impact]);
      expect((result.rikishi.get("r1") as { power?: number }).power).toBe(60);
      expect((result.rikishi.get("r1") as { speed?: number }).speed).toBe(55);
      expect(result.rikishi.get("r1")?.shikona).toBe("Test"); // Unchanged
    });

    it("applies collection operations - rikishi to historical", () => {
      const rikishi = mockRikishi("r1", { shikona: "Test" });
      world.rikishi.set(rikishi.id, rikishi);

      const impact: StateImpact = {
        collections: {
          rikishiToHistorical: ["r1"],
        },
        metadata: { source: "test" },
      };

      const result = ImpactResolver.resolveImpacts(world, [impact]);
      expect(result.rikishi.has("r1")).toBe(false);
      expect(result.historicalRikishi.has("r1")).toBe(true);
      expect(result.historicalRikishi.get("r1")?.shikona).toBe("Test");
    });

    it("applies collection operations - rikishi from historical", () => {
      const rikishi = mockRikishi("r1", { shikona: "Test" });
      world.historicalRikishi.set(rikishi.id, rikishi);

      const impact: StateImpact = {
        collections: {
          rikishiFromHistorical: ["r1"],
        },
        metadata: { source: "test" },
      };

      const result = ImpactResolver.resolveImpacts(world, [impact]);
      expect(result.historicalRikishi.has("r1")).toBe(false);
      expect(result.rikishi.has("r1")).toBe(true);
      expect(result.rikishi.get("r1")?.shikona).toBe("Test");
    });

    it("applies world field updates", () => {
      const impact: StateImpact = {
        worldFields: {
          year: 2026,
          week: 2,
          cyclePhase: "active_basho",
        },
        metadata: { source: "test" },
      };

      const result = ImpactResolver.resolveImpacts(world, [impact]);
      expect(result.year).toBe(2026);
      expect(result.week).toBe(2);
      expect(result.cyclePhase).toBe("active_basho");
    });

    it("applies multiple impacts in order", () => {
      const heya: Heya = {
        id: "heya-1",
        name: "Test Heya",
        funds: 1000,
        reputation: 50,
        prestigeBand: "unknown",
        statureBand: "new",
        oyakataId: "oyakata-1",
        isActive: true,
        facilities: { level: 1, condition: 100 },
        fanbase: 100,
        monthlyExpenses: 1000,
        rikishiIds: [],
      } as any;
      world.heyas.set(heya.id, heya);

      const impact1: StateImpact = {
        worldFields: { week: 2 },
        metadata: { source: "impact1" },
      };

      const impact2: StateImpact = {
        entities: {
          heyaUpdates: new Map([["heya-1", { funds: 2000 }]]),
        },
        metadata: { source: "impact2" },
      };

      const result = ImpactResolver.resolveImpacts(world, [impact1, impact2]);
      expect(result.week).toBe(2);
      expect(result.heyas.get("heya-1")?.funds).toBe(2000);
    });
  });

  describe("mergeImpacts", () => {
    it("merges entity updates from multiple impacts", () => {
      const impact1: StateImpact = {
        entities: {
          heyaUpdates: new Map([["h1", { funds: 1000 }]]),
        },
        metadata: { source: "impact1" },
      };

      const impact2: StateImpact = {
        entities: {
          heyaUpdates: new Map([["h1", { reputation: 75 }]]),
        },
        metadata: { source: "impact2" },
      };

      const merged = ImpactResolver.mergeImpacts([impact1, impact2]);
      expect(merged.entities?.heyaUpdates?.get("h1")).toEqual({ funds: 1000, reputation: 75 });
    });

    it("merges collection operations from multiple impacts", () => {
      const impact1: StateImpact = {
        collections: {
          rikishiToHistorical: ["r1"],
        },
        metadata: { source: "impact1" },
      };

      const impact2: StateImpact = {
        collections: {
          rikishiToHistorical: ["r2"],
        },
        metadata: { source: "impact2" },
      };

      const merged = ImpactResolver.mergeImpacts([impact1, impact2]);
      expect(merged.collections?.rikishiToHistorical).toEqual(["r1", "r2"]);
    });

    it("merges world field updates with last writer wins", () => {
      const impact1: StateImpact = {
        worldFields: { week: 2 },
        metadata: { source: "impact1" },
      };

      const impact2: StateImpact = {
        worldFields: { week: 3 },
        metadata: { source: "impact2" },
      };

      const merged = ImpactResolver.mergeImpacts([impact1, impact2]);
      expect(merged.worldFields?.week).toBe(3);
    });

    it("merges events from multiple impacts", () => {
      const impact1: StateImpact = {
        events: [{ type: "TRAINING_UPDATE" as any, category: "training", data: {} }],
        metadata: { source: "impact1" },
      };

      const impact2: StateImpact = {
        events: [{ type: "MEDICAL_REPORT" as any, category: "injury", data: {} }],
        metadata: { source: "impact2" },
      };

      const merged = ImpactResolver.mergeImpacts([impact1, impact2]);
      expect(merged.events?.length).toBe(2);
    });

    it("returns empty merged impact when input is empty", () => {
      const merged = ImpactResolver.mergeImpacts([]);
      // With lazy initialization, empty containers are absent rather than empty
      expect(merged.entities).toBeUndefined();
      expect(merged.collections).toBeUndefined();
      expect(merged.events).toBeUndefined();
      expect(merged.metadata?.source).toBe("merged");
    });
  });

  describe("heya roster sync", () => {
    function makeHeya(id: string, rikishiIds: string[] | undefined): Heya {
      return {
        id,
        name: `Heya-${id}`,
        funds: 1000,
        reputation: 50,
        prestigeBand: "unknown",
        statureBand: "new",
        oyakataId: `oyakata-${id}`,
        isActive: true,
        facilities: { level: 1, condition: 100 },
        fanbase: 100,
        monthlyExpenses: 1000,
        rikishiIds,
      } as any;
    }

    function setupRikishi(
      world: WorldState,
      ids: string[],
      heyaId: string = "h1"
    ): void {
      for (const id of ids) {
        world.rikishi.set(id, mockRikishi(id, { heyaId } as never));
      }
    }

    // ── rikishiToRemove roster sync ───────────────────────────────────────

    it("removes single rikishi from heya roster", () => {
      const heya = makeHeya("h1", ["r1", "r2"]);
      world.heyas.set("h1", heya);
      setupRikishi(world, ["r1", "r2"]);

      const impact: StateImpact = {
        collections: { rikishiToRemove: ["r1"] },
        metadata: { source: "test" },
      };

      const result = ImpactResolver.resolveImpacts(world, [impact]);
      expect(result.heyas.get("h1")?.rikishiIds).toEqual(["r2"]);
      expect(result.rikishi.has("r1")).toBe(false);
    });

    it("removes multiple rikishi from same heya (O(N²) case)", () => {
      const heya = makeHeya("h1", ["r1", "r2", "r3"]);
      world.heyas.set("h1", heya);
      setupRikishi(world, ["r1", "r2", "r3"]);

      const impact: StateImpact = {
        collections: { rikishiToRemove: ["r1", "r3"] },
        metadata: { source: "test" },
      };

      const result = ImpactResolver.resolveImpacts(world, [impact]);
      expect(result.heyas.get("h1")?.rikishiIds).toEqual(["r2"]);
      expect(result.rikishi.has("r1")).toBe(false);
      expect(result.rikishi.has("r3")).toBe(false);
      expect(result.rikishi.has("r2")).toBe(true);
    });

    it("removes rikishi from different heyas", () => {
      world.heyas.set("h1", makeHeya("h1", ["r1", "r2"]));
      world.heyas.set("h2", makeHeya("h2", ["r3", "r4"]));
      setupRikishi(world, ["r1", "r2"], "h1");
      setupRikishi(world, ["r3", "r4"], "h2");

      const impact: StateImpact = {
        collections: { rikishiToRemove: ["r1", "r3"] },
        metadata: { source: "test" },
      };

      const result = ImpactResolver.resolveImpacts(world, [impact]);
      expect(result.heyas.get("h1")?.rikishiIds).toEqual(["r2"]);
      expect(result.heyas.get("h2")?.rikishiIds).toEqual(["r4"]);
    });

    it("handles heya with undefined rikishiIds", () => {
      const heya = makeHeya("h1", undefined);
      world.heyas.set("h1", heya);
      setupRikishi(world, ["r1"]);

      const impact: StateImpact = {
        collections: { rikishiToRemove: ["r1"] },
        metadata: { source: "test" },
      };

      const result = ImpactResolver.resolveImpacts(world, [impact]);
      // Should not crash; rikishiIds becomes empty array after Set conversion
      expect(result.heyas.get("h1")?.rikishiIds).toEqual([]);
      expect(result.rikishi.has("r1")).toBe(false);
    });

    it("skips rikishi not in world.rikishi", () => {
      world.heyas.set("h1", makeHeya("h1", ["r1"]));

      const impact: StateImpact = {
        collections: { rikishiToRemove: ["ghost"] },
        metadata: { source: "test" },
      };

      const result = ImpactResolver.resolveImpacts(world, [impact]);
      // No crash, heya roster unchanged
      expect(result.heyas.get("h1")?.rikishiIds).toEqual(["r1"]);
    });

    it("skips when heya does not exist", () => {
      setupRikishi(world, ["r1"]);

      const impact: StateImpact = {
        collections: { rikishiToRemove: ["r1"] },
        metadata: { source: "test" },
      };

      const result = ImpactResolver.resolveImpacts(world, [impact]);
      // No crash, rikishi still removed from world
      expect(result.rikishi.has("r1")).toBe(false);
    });

    it("handles duplicate IDs in rikishiToRemove idempotently", () => {
      world.heyas.set("h1", makeHeya("h1", ["r1", "r2"]));
      setupRikishi(world, ["r1", "r2"]);

      const impact: StateImpact = {
        collections: { rikishiToRemove: ["r1", "r1"] },
        metadata: { source: "test" },
      };

      const result = ImpactResolver.resolveImpacts(world, [impact]);
      expect(result.heyas.get("h1")?.rikishiIds).toEqual(["r2"]);
      expect(result.rikishi.has("r1")).toBe(false);
    });

    it("preserves order of remaining rikishiIds", () => {
      world.heyas.set("h1", makeHeya("h1", ["r1", "r2", "r3", "r4"]));
      setupRikishi(world, ["r1", "r2", "r3", "r4"]);

      const impact: StateImpact = {
        collections: { rikishiToRemove: ["r2", "r4"] },
        metadata: { source: "test" },
      };

      const result = ImpactResolver.resolveImpacts(world, [impact]);
      expect(result.heyas.get("h1")?.rikishiIds).toEqual(["r1", "r3"]);
    });

    // ── rikishiToHistorical roster sync ───────────────────────────────────

    it("moves single rikishi to historical and removes from roster", () => {
      world.heyas.set("h1", makeHeya("h1", ["r1", "r2"]));
      setupRikishi(world, ["r1", "r2"]);

      const impact: StateImpact = {
        collections: { rikishiToHistorical: ["r1"] },
        metadata: { source: "test" },
      };

      const result = ImpactResolver.resolveImpacts(world, [impact]);
      expect(result.heyas.get("h1")?.rikishiIds).toEqual(["r2"]);
      expect(result.rikishi.has("r1")).toBe(false);
      expect(result.historicalRikishi.has("r1")).toBe(true);
    });

    it("moves multiple rikishi from same heya to historical", () => {
      world.heyas.set("h1", makeHeya("h1", ["r1", "r2", "r3"]));
      setupRikishi(world, ["r1", "r2", "r3"]);

      const impact: StateImpact = {
        collections: { rikishiToHistorical: ["r1", "r3"] },
        metadata: { source: "test" },
      };

      const result = ImpactResolver.resolveImpacts(world, [impact]);
      expect(result.heyas.get("h1")?.rikishiIds).toEqual(["r2"]);
      expect(result.historicalRikishi.has("r1")).toBe(true);
      expect(result.historicalRikishi.has("r3")).toBe(true);
    });

    it("handles heya with undefined rikishiIds for historical", () => {
      world.heyas.set("h1", makeHeya("h1", undefined));
      setupRikishi(world, ["r1"]);

      const impact: StateImpact = {
        collections: { rikishiToHistorical: ["r1"] },
        metadata: { source: "test" },
      };

      const result = ImpactResolver.resolveImpacts(world, [impact]);
      expect(result.heyas.get("h1")?.rikishiIds).toEqual([]);
      expect(result.historicalRikishi.has("r1")).toBe(true);
    });

    it("skips rikishi not in world.rikishi for historical", () => {
      world.heyas.set("h1", makeHeya("h1", ["r1"]));

      const impact: StateImpact = {
        collections: { rikishiToHistorical: ["ghost"] },
        metadata: { source: "test" },
      };

      const result = ImpactResolver.resolveImpacts(world, [impact]);
      expect(result.heyas.get("h1")?.rikishiIds).toEqual(["r1"]);
    });

    it("preserves order for historical roster sync", () => {
      world.heyas.set("h1", makeHeya("h1", ["r1", "r2", "r3", "r4"]));
      setupRikishi(world, ["r1", "r2", "r3", "r4"]);

      const impact: StateImpact = {
        collections: { rikishiToHistorical: ["r2", "r4"] },
        metadata: { source: "test" },
      };

      const result = ImpactResolver.resolveImpacts(world, [impact]);
      expect(result.heyas.get("h1")?.rikishiIds).toEqual(["r1", "r3"]);
    });

    // ── Cross-loop interaction ────────────────────────────────────────────

    it("both rikishiToRemove and rikishiToHistorical touch same heya", () => {
      world.heyas.set("h1", makeHeya("h1", ["r1", "r2", "r3"]));
      setupRikishi(world, ["r1", "r2", "r3"]);

      const impact: StateImpact = {
        collections: {
          rikishiToRemove: ["r1"],
          rikishiToHistorical: ["r2"],
        },
        metadata: { source: "test" },
      };

      const result = ImpactResolver.resolveImpacts(world, [impact]);
      expect(result.heyas.get("h1")?.rikishiIds).toEqual(["r3"]);
      expect(result.rikishi.has("r1")).toBe(false);
      expect(result.rikishi.has("r2")).toBe(false);
      expect(result.historicalRikishi.has("r2")).toBe(true);
      expect(result.historicalRikishi.has("r1")).toBe(false);
    });

    it("same ID in both rikishiToRemove and rikishiToHistorical", () => {
      world.heyas.set("h1", makeHeya("h1", ["r1", "r2"]));
      setupRikishi(world, ["r1", "r2"]);

      const impact: StateImpact = {
        collections: {
          rikishiToRemove: ["r1"],
          rikishiToHistorical: ["r1"],
        },
        metadata: { source: "test" },
      };

      const result = ImpactResolver.resolveImpacts(world, [impact]);
      // rikishiToRemove runs first, so r1 is deleted, not moved to historical
      expect(result.rikishi.has("r1")).toBe(false);
      expect(result.historicalRikishi.has("r1")).toBe(false);
      expect(result.heyas.get("h1")?.rikishiIds).toEqual(["r2"]);
    });

    // ── rikishiToAdd + rikishiToRemove interaction ────────────────────────

    it("add then remove same rikishi in one impact", () => {
      world.heyas.set("h1", makeHeya("h1", ["r2"]));
      setupRikishi(world, ["r2"], "h1");
      const r1 = mockRikishi("r1", { heyaId: "h1" } as never);

      const impact: StateImpact = {
        collections: {
          rikishiToAdd: [r1],
          rikishiToRemove: ["r1"],
        },
        metadata: { source: "test" },
      };

      const result = ImpactResolver.resolveImpacts(world, [impact]);
      // r1 was added then removed — net zero, no duplicate in roster
      expect(result.rikishi.has("r1")).toBe(false);
      expect(result.heyas.get("h1")?.rikishiIds).toEqual(["r2"]);
    });
  });
});
