import { describe, it, expect } from "vitest";
import {
  buildYouthAcademy,
  upgradeYouthAcademy,
  getYouthAcademy,
  getMaxProspects,
  getQualityBonus,
  MAX_ACADEMY_LEVEL,
} from "@/engine/systems/recruitment/YouthAcademyService";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { generateInitialWorld } from "@/engine/systems/generation/WorldFactory";
import type { WorldState } from "@/engine/types/world";

function setCash(world: WorldState, heyaId: string, cash: number) {
  const heya = world.heyas.get(heyaId)!;
  heya.economics = { ...(heya.economics ?? {}), cash };
}

describe("YouthAcademyService", () => {
  describe("buildYouthAcademy", () => {
    it("builds a level-1 academy when heya has enough cash", () => {
      const world = generateInitialWorld("youth-academy-build-1");
      const heyaId = world.playerHeyaId;
      setCash(world, heyaId, 100_000);

      const impact = buildYouthAcademy(world, heyaId);
      const updated = resolveImpacts(world, [impact]);

      const heya = updated.heyas.get(heyaId)!;
      const academy = getYouthAcademy(heya);
      expect(academy).not.toBeNull();
      expect(academy!.level).toBe(1);
      expect(academy!.prospects).toEqual([]);
    });

    it("deducts the build cost from heya cash", () => {
      const world = generateInitialWorld("youth-academy-build-2");
      const heyaId = world.playerHeyaId;
      setCash(world, heyaId, 100_000);

      const impact = buildYouthAcademy(world, heyaId);
      const updated = resolveImpacts(world, [impact]);

      const heya = updated.heyas.get(heyaId)!;
      expect(heya.economics?.cash).toBe(50_000); // 100k - 50k cost
    });

    it("refuses to build if not enough cash", () => {
      const world = generateInitialWorld("youth-academy-build-3");
      const heyaId = world.playerHeyaId;
      setCash(world, heyaId, 10_000);

      const impact = buildYouthAcademy(world, heyaId);
      const updated = resolveImpacts(world, [impact]);

      const heya = updated.heyas.get(heyaId)!;
      expect(getYouthAcademy(heya)).toBeNull();
    });

    it("refuses to build if academy already exists", () => {
      const world = generateInitialWorld("youth-academy-build-4");
      const heyaId = world.playerHeyaId;
      setCash(world, heyaId, 200_000);

      const impact1 = buildYouthAcademy(world, heyaId);
      let current = resolveImpacts(world, [impact1]);
      expect(getYouthAcademy(current.heyas.get(heyaId)!)).not.toBeNull();

      const impact2 = buildYouthAcademy(current, heyaId);
      current = resolveImpacts(current, [impact2]);
      // Should still be level 1
      expect(getYouthAcademy(current.heyas.get(heyaId)!)!.level).toBe(1);
    });
  });

  describe("upgradeYouthAcademy", () => {
    it("upgrades from level 1 to level 2", () => {
      const world = generateInitialWorld("youth-academy-upgrade-1");
      const heyaId = world.playerHeyaId;
      setCash(world, heyaId, 500_000);

      const buildImpact = buildYouthAcademy(world, heyaId);
      let current = resolveImpacts(world, [buildImpact]);

      const upgradeImpact = upgradeYouthAcademy(current, heyaId);
      current = resolveImpacts(current, [upgradeImpact]);

      expect(getYouthAcademy(current.heyas.get(heyaId)!)!.level).toBe(2);
    });

    it("deducts upgrade cost", () => {
      const world = generateInitialWorld("youth-academy-upgrade-2");
      const heyaId = world.playerHeyaId;
      setCash(world, heyaId, 500_000);

      const buildImpact = buildYouthAcademy(world, heyaId);
      let current = resolveImpacts(world, [buildImpact]);
      // After build: 500k - 50k = 450k

      const upgradeImpact = upgradeYouthAcademy(current, heyaId);
      current = resolveImpacts(current, [upgradeImpact]);
      // After upgrade: 450k - 150k = 300k

      expect(current.heyas.get(heyaId)!.economics?.cash).toBe(300_000);
    });

    it("refuses upgrade at max level", () => {
      const world = generateInitialWorld("youth-academy-upgrade-5");
      const heyaId = world.playerHeyaId;
      setCash(world, heyaId, 10_000_000);

      let current = world;
      const buildImpact = buildYouthAcademy(current, heyaId);
      current = resolveImpacts(current, [buildImpact]);

      // Upgrade from level 1 to MAX_ACADEMY_LEVEL (5)
      for (let i = 1; i < MAX_ACADEMY_LEVEL; i++) {
        const up = upgradeYouthAcademy(current, heyaId);
        current = resolveImpacts(current, [up]);
      }
      expect(getYouthAcademy(current.heyas.get(heyaId)!)!.level).toBe(MAX_ACADEMY_LEVEL);

      // Try to upgrade beyond max — should be refused
      const overUpgrade = upgradeYouthAcademy(current, heyaId);
      current = resolveImpacts(current, [overUpgrade]);
      expect(getYouthAcademy(current.heyas.get(heyaId)!)!.level).toBe(MAX_ACADEMY_LEVEL);
    });
  });

  describe("getMaxProspects", () => {
    it("returns 3 for level 1", () => {
      expect(getMaxProspects({ level: 1, prospects: [], totalGraduated: 0 })).toBe(3);
    });
    it("returns 5 for level 2", () => {
      expect(getMaxProspects({ level: 2, prospects: [], totalGraduated: 0 })).toBe(5);
    });
    it("returns 8 for level 3", () => {
      expect(getMaxProspects({ level: 3, prospects: [], totalGraduated: 0 })).toBe(8);
    });
  });

  describe("getQualityBonus", () => {
    it("returns 5 for level 1", () => {
      expect(getQualityBonus({ level: 1, prospects: [], totalGraduated: 0 })).toBe(5);
    });
    it("returns 15 for level 3", () => {
      expect(getQualityBonus({ level: 3, prospects: [], totalGraduated: 0 })).toBe(15);
    });
  });
});
