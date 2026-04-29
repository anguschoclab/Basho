import { describe, it, expect } from "vitest";
import { updateRikishiImpact } from "../ImpactBuilder";

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
});
