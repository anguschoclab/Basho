/**
 * StateImpact Unit Tests
 */

import { describe, it, expect } from "vitest";
import { isStateImpact, createEmptyImpact, resetImpactTimestampCounter } from "../StateImpact";
import type { StateImpact } from "../StateImpact";

describe("StateImpact", () => {
  describe("isStateImpact", () => {
    it("returns true for valid StateImpact with entities", () => {
      const impact: StateImpact = {
        entities: {
          heyaUpdates: new Map([["h1", { funds: 1000 } as any]]),
        },
        metadata: { source: "test" },
      };
      expect(isStateImpact(impact)).toBe(true);
    });

    it("returns true for valid StateImpact with collections", () => {
      const impact: StateImpact = {
        collections: {
          rikishiToHistorical: ["r1"],
        },
        metadata: { source: "test" },
      };
      expect(isStateImpact(impact)).toBe(true);
    });

    it("returns true for valid StateImpact with worldFields", () => {
      const impact: StateImpact = {
        worldFields: { week: 2 } as any,
        metadata: { source: "test" },
      };
      expect(isStateImpact(impact)).toBe(true);
    });

    it("returns true for valid StateImpact with events", () => {
      const impact: StateImpact = {
        events: [{ type: "TRAINING_UPDATE" as any, category: "training", data: {} }],
        metadata: { source: "test" },
      };
      expect(isStateImpact(impact)).toBe(true);
    });

    it("returns false for null", () => {
      expect(isStateImpact(null)).toBe(false);
    });

    it("returns false for undefined", () => {
      expect(isStateImpact(undefined)).toBe(false);
    });

    it("returns false for non-object values", () => {
      expect(isStateImpact(123)).toBe(false);
      expect(isStateImpact("string")).toBe(false);
      expect(isStateImpact(true)).toBe(false);
    });

    it("returns false for empty object", () => {
      expect(isStateImpact({})).toBe(false);
    });

    it("returns false for object without impact fields", () => {
      expect(isStateImpact({ foo: "bar" })).toBe(false);
    });
  });

  describe("createEmptyImpact", () => {
    it("creates an empty impact with default metadata", () => {
      const impact = createEmptyImpact();
      expect(impact.metadata?.source).toBe("unknown");
      expect(impact.metadata?.timestamp).toBeDefined();
      expect(impact.entities).toBeUndefined();
      expect(impact.collections).toBeUndefined();
      expect(impact.worldFields).toBeUndefined();
      expect(impact.events).toBeUndefined();
    });

    it("creates an empty impact with custom metadata", () => {
      const customMetadata = { source: "test-source", customField: "value" };
      const impact = createEmptyImpact(customMetadata);
      expect(impact.metadata?.source).toBe("test-source");
      expect(impact.metadata?.customField).toBe("value");
      expect(impact.metadata?.timestamp).toBeDefined();
    });

    it("generates timestamp when not provided", () => {
      resetImpactTimestampCounter();
      const impact1 = createEmptyImpact({ source: "test" });
      const impact2 = createEmptyImpact({ source: "test" });
      expect(impact1.metadata?.timestamp).toBeDefined();
      expect(impact2.metadata?.timestamp).toBeDefined();
      expect(typeof impact1.metadata?.timestamp).toBe("number");
      expect(typeof impact2.metadata?.timestamp).toBe("number");
      // Check that timestamps increment deterministically
      expect(impact2.metadata?.timestamp).toBeGreaterThan(impact1.metadata?.timestamp as number);
    });
  });

  describe("StateImpact structure", () => {
    it("allows partial entity updates", () => {
      const impact: StateImpact = {
        entities: {
          heyaUpdates: new Map([["h1", { funds: 1000 } as any]]),
          rikishiUpdates: new Map([["r1", { power: 60 } as any]]),
        },
        metadata: { source: "test" },
      };
      expect(impact.entities?.heyaUpdates?.size).toBe(1);
      expect(impact.entities?.rikishiUpdates?.size).toBe(1);
    });

    it("allows collection operations", () => {
      const impact: StateImpact = {
        collections: {
          rikishiToAdd: [] as any[],
          rikishiToRemove: ["r1"],
          rikishiToHistorical: ["r2"],
        },
        metadata: { source: "test" },
      };
      expect(impact.collections?.rikishiToRemove).toEqual(["r1"]);
      expect(impact.collections?.rikishiToHistorical).toEqual(["r2"]);
    });

    it("allows world field updates", () => {
      const impact: StateImpact = {
        worldFields: { week: 2, year: 2026 } as any,
        metadata: { source: "test" },
      };
      expect(impact.worldFields?.week).toBe(2);
      expect(impact.worldFields?.year).toBe(2026);
    });

    it("allows event definitions", () => {
      const impact: StateImpact = {
        events: [
          { type: "TRAINING_UPDATE" as any, category: "training", data: {} },
          { type: "MEDICAL_REPORT" as any, category: "injury", data: {} },
        ],
        metadata: { source: "test" },
      };
      expect(impact.events?.length).toBe(2);
    });

    it("allows custom metadata", () => {
      const impact: StateImpact = {
        entities: {
          heyaUpdates: new Map([["h1", { funds: 1000 } as any]]),
        },
        metadata: {
          source: "test",
          timestamp: 1234567890,
          customField: "custom-value",
        },
      };
      expect(impact.metadata?.source).toBe("test");
      expect(impact.metadata?.timestamp).toBe(1234567890);
      expect((impact.metadata as any).customField).toBe("custom-value");
    });
  });
});
