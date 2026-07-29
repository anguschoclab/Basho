import { describe, it, expect } from "vitest";
import { InfrastructureService } from "@/engine/systems/economy/InfrastructureService";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import { CONSTRUCTION_COST_LEVEL_MULTIPLIER } from "@/constants/engine/economyExtended";

describe("InfrastructureService", () => {
  describe("startConstruction", () => {
    it("should successfully queue construction and deduct funds", () => {
      const world = MockFactory.createWorld({ year: 2025 });
      const heya = MockFactory.createHeya("heya-1", {
        funds: 100_000_000,
      });
      world.heyas.set(heya.id, heya);

      const impact = InfrastructureService.startConstruction(world, heya.id, "weights_room");

      expect(impact.entities?.heyaUpdates?.get(heya.id)?.funds).toBe(100_000_000 - 15_000_000);
      expect(impact.entities?.heyaUpdates?.get(heya.id)?.constructionQueue?.length).toBe(1);
      expect(impact.events?.[0].type).toBe("CONSTRUCTION_STARTED");
    });

    it("should reject construction if already under construction", () => {
      const world = MockFactory.createWorld({ year: 2025 });
      const heya = MockFactory.createHeya("heya-1", {
        funds: 100_000_000,
        infrastructure: {
          weights_room: {
            level: 1,
            status: "under_construction",
          },
        },
      });
      world.heyas.set(heya.id, heya);

      const impact = InfrastructureService.startConstruction(world, heya.id, "weights_room");

      expect(impact.entities?.heyaUpdates?.size ?? 0).toBe(0);
      expect(impact.events?.length).toBeUndefined();
    });

    it("should scale cost with current level", () => {
      const world = MockFactory.createWorld({ year: 2025 });
      const heya = MockFactory.createHeya("heya-1", {
        funds: 100_000_000,
        infrastructure: {
          weights_room: {
            level: 1,
            status: "active",
          },
        },
      });
      world.heyas.set(heya.id, heya);

      const impact = InfrastructureService.startConstruction(world, heya.id, "weights_room");
      const expectedCost = 15_000_000 * (1 + 1 * CONSTRUCTION_COST_LEVEL_MULTIPLIER);

      expect(impact.entities?.heyaUpdates?.get(heya.id)?.funds).toBe(100_000_000 - expectedCost);
    });

    it("should fail if requirements are not met (e.g. regional presence)", () => {
      const world = MockFactory.createWorld({ year: 2025 });
      const heya = MockFactory.createHeya("heya-1", {
        funds: 100_000_000,
        regionalPresence: { mongolia: 10 }, // Insufficient, requires 80? Let's check registry
      });
      world.heyas.set(heya.id, heya);

      const impact = InfrastructureService.startConstruction(world, heya.id, "academy_mongolia");

      expect(impact.entities?.heyaUpdates?.size ?? 0).toBe(0);
      expect(impact.events?.[0].type).toBe("CONSTRUCTION_STARTED");
      expect((impact.events?.[0].data as any).status).toBe("failed_requirements");
    });
  });

  describe("processCompletionTick", () => {
    it("should activate completed facilities and remove them from the queue", () => {
      const world = MockFactory.createWorld({ year: 2026 });
      const heya = MockFactory.createHeya("heya-1", {
        constructionQueue: [
          {
            facilityId: "weights_room",
            level: 1,
            completionYear: 2026,
            completionBasho: "TBD",
          },
        ],
      });
      world.heyas.set(heya.id, heya);

      const impact = InfrastructureService.processCompletionTick(world);

      const updates = impact.entities?.heyaUpdates?.get(heya.id);
      expect(updates?.constructionQueue?.length).toBe(0);
      expect(updates?.infrastructure?.["weights_room"]?.status).toBe("active");
      expect(updates?.infrastructure?.["weights_room"]?.level).toBe(1);
      expect(impact.events?.[0].type).toBe("CONSTRUCTION_COMPLETED");
    });

    it("should ignore projects not yet ready to complete", () => {
      const world = MockFactory.createWorld({ year: 2025 });
      const heya = MockFactory.createHeya("heya-1", {
        constructionQueue: [
          {
            facilityId: "weights_room",
            level: 1,
            completionYear: 2026, // not reached yet
            completionBasho: "TBD",
          },
        ],
      });
      world.heyas.set(heya.id, heya);

      const impact = InfrastructureService.processCompletionTick(world);

      const updates = impact.entities?.heyaUpdates?.get(heya.id);
      expect(updates?.constructionQueue?.length).toBe(1);
      expect(updates?.infrastructure?.["weights_room"]).toBeUndefined();
    });
  });

  describe("getHeyaBonuses", () => {
    it("should return default bonuses if heya has no active infrastructure", () => {
      const heya = MockFactory.createHeya("heya-1", {});
      const bonuses = InfrastructureService.getHeyaBonuses(heya);

      expect(bonuses.statBuffs.power).toBe(1);
      expect(bonuses.injuryHealMod).toBe(0);
    });

    it("should aggregate bonuses for active facilities only", () => {
      const heya = MockFactory.createHeya("heya-1", {
        infrastructure: {
          weights_room: { level: 2, status: "active" },
          medical_suite: { level: 1, status: "under_construction" }, // should be ignored
        },
      });

      const bonuses = InfrastructureService.getHeyaBonuses(heya);

      // weights_room gives power: 1.15
      // With level 2: 1 + (1.15 - 1) * 2 = 1.30
      expect(bonuses.statBuffs.power).toBeCloseTo(1.3);
      expect(bonuses.injuryHealMod).toBe(0); // medical suite is not active
    });
  });
});
