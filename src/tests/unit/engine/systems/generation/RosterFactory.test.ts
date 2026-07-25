import { describe, it, expect } from "vitest";
import { createRosters } from "@/engine/systems/generation/RosterFactory";
import { createStables } from "@/engine/systems/generation/HeyaFactory";
import { rngFromSeed } from "@/engine/rng";

describe("RosterFactory", () => {
  describe("createRosters", () => {
    it("generates a non-empty roster of rikishi", () => {
      const rng = rngFromSeed("test", "rosterfactory", "unit");
      const { heyaMap, oyakataMap } = createStables(rng);
      const rikishiMap = createRosters(rng, heyaMap, oyakataMap);
      expect(rikishiMap.size).toBeGreaterThan(0);
    });

    it("assigns every rikishi to a heya", () => {
      const rng = rngFromSeed("test", "rosterfactory", "unit");
      const { heyaMap, oyakataMap } = createStables(rng);
      const rikishiMap = createRosters(rng, heyaMap, oyakataMap);
      for (const r of rikishiMap.values()) {
        expect(r.heyaId).toBeDefined();
        expect(heyaMap.has(r.heyaId)).toBe(true);
      }
    });

    it("adds rikishi IDs to heya.rikishiIds", () => {
      const rng = rngFromSeed("test", "rosterfactory", "unit");
      const { heyaMap, oyakataMap } = createStables(rng);
      const rikishiMap = createRosters(rng, heyaMap, oyakataMap);
      let totalAssigned = 0;
      for (const heya of heyaMap.values()) {
        totalAssigned += heya.rikishiIds?.length ?? 0;
      }
      expect(totalAssigned).toBe(rikishiMap.size);
    });

    it("is deterministic with same seed", () => {
      const rng1 = rngFromSeed("test", "rosterfactory", "det");
      const rng2 = rngFromSeed("test", "rosterfactory", "det");
      const stables1 = createStables(rng1);
      const stables2 = createStables(rng2);
      const rosters1 = createRosters(rng1, stables1.heyaMap, stables1.oyakataMap);
      const rosters2 = createRosters(rng2, stables2.heyaMap, stables2.oyakataMap);
      expect(rosters1.size).toBe(rosters2.size);
      expect(Array.from(rosters1.keys())).toEqual(Array.from(rosters2.keys()));
    });

    it("generates rikishi across multiple divisions", () => {
      const rng = rngFromSeed("test", "rosterfactory", "div");
      const { heyaMap, oyakataMap } = createStables(rng);
      const rikishiMap = createRosters(rng, heyaMap, oyakataMap);
      const divisions = new Set<string>();
      for (const r of rikishiMap.values()) {
        if (r.division) divisions.add(r.division);
      }
      expect(divisions.size).toBeGreaterThan(1);
    });
  });
});
