import { describe, it, expect } from "vitest";
import { createHeyaWithOyakata, createStables } from "@/engine/systems/generation/HeyaFactory";
import { rngFromSeed } from "@/engine/rng";

describe("HeyaFactory", () => {
  describe("createHeyaWithOyakata", () => {
    it("creates a heya and oyakata pair", () => {
      const rng = rngFromSeed("test", "heyafactory", "unit");
      const { heya, oyakata } = createHeyaWithOyakata({
        id: "heya-1",
        name: "Kokonoe",
        rng,
        tier: 0.2,
      });
      expect(heya.id).toBe("heya-1");
      expect(heya.name).toBe("Kokonoe");
      expect(heya.oyakataId).toBe(oyakata.id);
      expect(oyakata.id).toBeDefined();
    });

    it("assigns stature band based on tier", () => {
      const rng = rngFromSeed("test", "heyafactory", "unit");
      const { heya: legendary } = createHeyaWithOyakata({
        id: "h1",
        name: "Test1",
        rng,
        tier: 0.05,
      });
      expect(legendary.statureBand).toBe("legendary");

      const { heya: powerful } = createHeyaWithOyakata({
        id: "h2",
        name: "Test2",
        rng,
        tier: 0.2,
      });
      expect(powerful.statureBand).toBe("powerful");

      const { heya: newHeya } = createHeyaWithOyakata({
        id: "h3",
        name: "Test3",
        rng,
        tier: 0.9,
      });
      expect(newHeya.statureBand).toBe("new");
    });

    it("assigns higher funds to elite stables", () => {
      const rng = rngFromSeed("test", "heyafactory", "unit");
      const { heya: elite } = createHeyaWithOyakata({
        id: "h1",
        name: "Test1",
        rng,
        tier: 0.1,
      });
      const { heya: standard } = createHeyaWithOyakata({
        id: "h2",
        name: "Test2",
        rng,
        tier: 0.5,
      });
      expect(elite.funds).toBeGreaterThan(standard.funds);
    });

    it("initializes welfare state", () => {
      const rng = rngFromSeed("test", "heyafactory", "unit");
      const { heya } = createHeyaWithOyakata({
        id: "h1",
        name: "Test",
        rng,
        tier: 0.3,
      });
      expect(heya.welfareState).toBeDefined();
      expect(heya.welfareState?.complianceState).toBe("compliant");
    });
  });

  describe("createStables", () => {
    it("creates 45 stables with oyakata", () => {
      const rng = rngFromSeed("test", "heyafactory", "stables");
      const { heyaMap, oyakataMap } = createStables(rng);
      expect(heyaMap.size).toBe(45);
      expect(oyakataMap.size).toBe(45);
    });

    it("assigns oyakata to each heya", () => {
      const rng = rngFromSeed("test", "heyafactory", "stables");
      const { heyaMap, oyakataMap } = createStables(rng);
      for (const heya of heyaMap.values()) {
        expect(oyakataMap.has(heya.oyakataId)).toBe(true);
      }
    });

    it("initializes empty rikishiIds for each heya", () => {
      const rng = rngFromSeed("test", "heyafactory", "stables");
      const { heyaMap } = createStables(rng);
      for (const heya of heyaMap.values()) {
        expect(heya.rikishiIds).toEqual([]);
      }
    });

    it("is deterministic with same seed", () => {
      const rng1 = rngFromSeed("test", "heyafactory", "det");
      const rng2 = rngFromSeed("test", "heyafactory", "det");
      const result1 = createStables(rng1);
      const result2 = createStables(rng2);
      expect(result1.heyaMap.size).toBe(result2.heyaMap.size);
      const ids1 = Array.from(result1.heyaMap.keys());
      const ids2 = Array.from(result2.heyaMap.keys());
      expect(ids1).toEqual(ids2);
    });
  });
});
