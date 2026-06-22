/**
 * heyaUI.test.ts
 *
 * Tests for heyaUI presenter functions.
 */

import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { projectHeya } from "@/presenters/heyaUI";
import { makeMockHeya, mockRikishi, makeMockWorld } from "../engine/utils";
import type { Staff } from "../../engine/types/staff";
import type { Oyakata } from "../../engine/types/oyakata";

// Local type definition for Style (matches usage in queries.ts)
type Style = "oshi" | "yotsu" | "hybrid";

// Mock query functions
vi.mock("@/engine/queries", () => ({
  getOyakataForHeya: vi.fn(),
  getHeyaStaff: vi.fn(),
  getHeyaStyleBias: vi.fn(),
}));

import { getOyakataForHeya, getHeyaStaff, getHeyaStyleBias } from "@/engine/queries";

const mockGetOyakataForHeya = getOyakataForHeya as Mock;
const mockGetHeyaStaff = getHeyaStaff as Mock;
const mockGetHeyaStyleBias = getHeyaStyleBias as Mock;

describe("heyaUI - projectHeya", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Basic Property Mapping", () => {
    it("should map id, name, isPlayerOwned correctly", () => {
      const heya = makeMockHeya("h1", {
        id: "h1",
        name: "Test Heya",
        isPlayerOwned: true,
      });
      const world = makeMockWorld();

      mockGetOyakataForHeya.mockReturnValue(undefined);
      mockGetHeyaStaff.mockReturnValue([]);
      mockGetHeyaStyleBias.mockReturnValue("neutral" as Style);

      const result = projectHeya(heya, world);

      expect(result.id).toBe("h1");
      expect(result.name).toBe("Test Heya");
      expect(result.isPlayerOwned).toBe(true);
    });

    it("should map prestige, funds, location, ichimon with defaults", () => {
      const heya = makeMockHeya("h1", {
        prestige: 65,
        funds: 1_000_000,
        location: "Osaka",
        ichimon: "Nishonoseki",
      });
      const world = makeMockWorld();

      mockGetOyakataForHeya.mockReturnValue(undefined);
      mockGetHeyaStaff.mockReturnValue([]);
      mockGetHeyaStyleBias.mockReturnValue("neutral" as Style);

      const result = projectHeya(heya, world);

      expect(result.prestige).toBe(65);
      expect(result.funds).toBe(1_000_000);
      expect(result.location).toBe("Osaka");
      expect(result.ichimon).toBe("Nishonoseki");
    });

    it("should handle undefined optional fields with defaults", () => {
      const heya = makeMockHeya("h1", {
        location: undefined,
        ichimon: undefined,
      });
      const world = makeMockWorld();

      mockGetOyakataForHeya.mockReturnValue(undefined);
      mockGetHeyaStaff.mockReturnValue([]);
      mockGetHeyaStyleBias.mockReturnValue("neutral" as Style);

      const result = projectHeya(heya, world);

      expect(result.location).toBe("Tokyo");
      expect(result.ichimon).toBe("Independent");
    });

    it("should default isPlayerOwned to false when not set", () => {
      const heya = makeMockHeya("h1", {
        isPlayerOwned: undefined,
      });
      const world = makeMockWorld();

      mockGetOyakataForHeya.mockReturnValue(undefined);
      mockGetHeyaStaff.mockReturnValue([]);
      mockGetHeyaStyleBias.mockReturnValue("neutral" as Style);

      const result = projectHeya(heya, world);

      expect(result.isPlayerOwned).toBe(false);
    });
  });

  describe("Oyakata Resolution", () => {
    it("should resolve oyakataName when oyakata exists", () => {
      const heya = makeMockHeya("h1", { oyakataId: "oyakata-1" });
      const world = makeMockWorld();

      const mockOyakata: Oyakata = {
        id: "oyakata-1",
        heyaId: "h1",
        name: "Test Oyakata",
        shikona: "TestShikona",
        age: 50,
        archetype: "traditionalist",
        traits: { ambition: 50, patience: 50, risk: 50, tradition: 50, compassion: 50 },
        yearsInCharge: 10,
      };

      mockGetOyakataForHeya.mockReturnValue(mockOyakata);
      mockGetHeyaStaff.mockReturnValue([]);
      mockGetHeyaStyleBias.mockReturnValue("neutral" as Style);

      const result = projectHeya(heya, world);

      expect(result.oyakataName).toBe("TestShikona");
      expect(result.oyakataId).toBe("oyakata-1");
    });

    it("should default to Vacant when oyakata not found", () => {
      const heya = makeMockHeya("h1", { oyakataId: "oyakata-1" });
      const world = makeMockWorld();

      mockGetOyakataForHeya.mockReturnValue(undefined);
      mockGetHeyaStaff.mockReturnValue([]);
      mockGetHeyaStyleBias.mockReturnValue("neutral" as Style);

      const result = projectHeya(heya, world);

      expect(result.oyakataName).toBe("Vacant");
      expect(result.oyakataId).toBe("oyakata-1");
    });
  });

  describe("Staff Mapping", () => {
    it("should map staff to UIStaffEntry with id, name, role", () => {
      const heya = makeMockHeya("h1");
      const world = makeMockWorld();

      const mockStaff: Staff[] = [
        {
          id: "staff-1",
          heyaId: "h1",
          name: "Coach A",
          role: "technique_coach",
          age: 40,
          careerPhase: "established",
          reputationBand: "respected",
          loyaltyBand: "stable",
          competenceBands: { primary: "strong" },
          fatigue: 10,
          morale: 80,
          scandalExposure: 0,
          yearsAtBeya: 5,
          priorAffiliations: [],
          successorEligible: false,
        },
      ];

      mockGetOyakataForHeya.mockReturnValue(undefined);
      mockGetHeyaStaff.mockReturnValue(mockStaff);
      mockGetHeyaStyleBias.mockReturnValue("neutral" as Style);

      const result = projectHeya(heya, world);

      expect(result.staff).toHaveLength(1);
      expect(result.staff[0].id).toBe("staff-1");
      expect(result.staff[0].name).toBe("Coach A");
      expect(result.staff[0].role).toBe("technique_coach");
    });

    it("should use specialty field when present", () => {
      const heya = makeMockHeya("h1");
      const world = makeMockWorld();

      const mockStaff: Staff[] = [
        {
          id: "staff-1",
          heyaId: "h1",
          name: "Coach A",
          role: "technique_coach",
          age: 40,
          careerPhase: "established",
          reputationBand: "respected",
          loyaltyBand: "stable",
          competenceBands: { primary: "strong" },
          fatigue: 10,
          morale: 80,
          scandalExposure: 0,
          yearsAtBeya: 5,
          priorAffiliations: [],
          successorEligible: false,
          specialty: "Throwing",
        } as any,
      ];

      mockGetOyakataForHeya.mockReturnValue(undefined);
      mockGetHeyaStaff.mockReturnValue(mockStaff);
      mockGetHeyaStyleBias.mockReturnValue("neutral" as Style);

      const result = projectHeya(heya, world);

      expect(result.staff[0].specialty).toBe("Throwing");
    });

    it("should default to General when specialty absent", () => {
      const heya = makeMockHeya("h1");
      const world = makeMockWorld();

      const mockStaff: Staff[] = [
        {
          id: "staff-1",
          heyaId: "h1",
          name: "Coach A",
          role: "technique_coach",
          age: 40,
          careerPhase: "established",
          reputationBand: "respected",
          loyaltyBand: "stable",
          competenceBands: { primary: "strong" },
          fatigue: 10,
          morale: 80,
          scandalExposure: 0,
          yearsAtBeya: 5,
          priorAffiliations: [],
          successorEligible: false,
        },
      ];

      mockGetOyakataForHeya.mockReturnValue(undefined);
      mockGetHeyaStaff.mockReturnValue(mockStaff);
      mockGetHeyaStyleBias.mockReturnValue("neutral" as Style);

      const result = projectHeya(heya, world);

      expect(result.staff[0].specialty).toBe("General");
    });

    it("should return empty array when no staff", () => {
      const heya = makeMockHeya("h1");
      const world = makeMockWorld();

      mockGetOyakataForHeya.mockReturnValue(undefined);
      mockGetHeyaStaff.mockReturnValue([]);
      mockGetHeyaStyleBias.mockReturnValue("neutral" as Style);

      const result = projectHeya(heya, world);

      expect(result.staff).toHaveLength(0);
    });
  });

  describe("Roster Mapping", () => {
    it("should map rikishiIds to UIRosterEntry", () => {
      const rikishi1 = mockRikishi("r1", { shikona: "Rikishi A", heyaId: "h1" });
      const rikishi2 = mockRikishi("r2", { shikona: "Rikishi B", heyaId: "h1" });

      const heya = makeMockHeya("h1", { rikishiIds: ["r1", "r2"] });
      const world = makeMockWorld({
        rikishi: new Map([
          ["r1", rikishi1],
          ["r2", rikishi2],
        ]),
      });

      mockGetOyakataForHeya.mockReturnValue(undefined);
      mockGetHeyaStaff.mockReturnValue([]);
      mockGetHeyaStyleBias.mockReturnValue("neutral" as Style);

      const result = projectHeya(heya, world);

      expect(result.roster).toHaveLength(2);
      expect(result.roster[0].shikona).toBe("Rikishi A");
      expect(result.roster[1].shikona).toBe("Rikishi B");
      expect(result.rosterSize).toBe(2);
    });

    it("should handle dangling references (rikishi not in world)", () => {
      const rikishi1 = mockRikishi("r1", { shikona: "Rikishi A", heyaId: "h1" });

      const heya = makeMockHeya("h1", { rikishiIds: ["r1", "r2"] }); // r2 doesn't exist
      const world = makeMockWorld({
        rikishi: new Map([["r1", rikishi1]]),
      });

      mockGetOyakataForHeya.mockReturnValue(undefined);
      mockGetHeyaStaff.mockReturnValue([]);
      mockGetHeyaStyleBias.mockReturnValue("neutral" as Style);

      const result = projectHeya(heya, world);

      expect(result.roster).toHaveLength(1); // Only r1
      expect(result.rosterSize).toBe(1);
    });

    it("should return empty array when no rikishiIds", () => {
      const heya = makeMockHeya("h1", { rikishiIds: [] });
      const world = makeMockWorld();

      mockGetOyakataForHeya.mockReturnValue(undefined);
      mockGetHeyaStaff.mockReturnValue([]);
      mockGetHeyaStyleBias.mockReturnValue("neutral" as Style);

      const result = projectHeya(heya, world);

      expect(result.roster).toHaveLength(0);
      expect(result.rosterSize).toBe(0);
    });

    it("should handle undefined rikishiIds", () => {
      const heya = makeMockHeya("h1", { rikishiIds: undefined });
      const world = makeMockWorld();

      mockGetOyakataForHeya.mockReturnValue(undefined);
      mockGetHeyaStaff.mockReturnValue([]);
      mockGetHeyaStyleBias.mockReturnValue("neutral" as Style);

      const result = projectHeya(heya, world);

      expect(result.roster).toHaveLength(0);
      expect(result.rosterSize).toBe(0);
    });
  });

  describe("Prestige Band Calculation", () => {
    it("should return Emerging for prestige < 20", () => {
      const heya = makeMockHeya("h1", { prestige: 15 });
      const world = makeMockWorld();

      mockGetOyakataForHeya.mockReturnValue(undefined);
      mockGetHeyaStaff.mockReturnValue([]);
      mockGetHeyaStyleBias.mockReturnValue("neutral" as Style);

      const result = projectHeya(heya, world);

      expect(result.prestigeBand).toBe("Emerging");
    });

    it("should return Respected for prestige < 50", () => {
      const heya = makeMockHeya("h1", { prestige: 35 });
      const world = makeMockWorld();

      mockGetOyakataForHeya.mockReturnValue(undefined);
      mockGetHeyaStaff.mockReturnValue([]);
      mockGetHeyaStyleBias.mockReturnValue("neutral" as Style);

      const result = projectHeya(heya, world);

      expect(result.prestigeBand).toBe("Respected");
    });

    it("should return Elite for prestige < 80", () => {
      const heya = makeMockHeya("h1", { prestige: 65 });
      const world = makeMockWorld();

      mockGetOyakataForHeya.mockReturnValue(undefined);
      mockGetHeyaStaff.mockReturnValue([]);
      mockGetHeyaStyleBias.mockReturnValue("neutral" as Style);

      const result = projectHeya(heya, world);

      expect(result.prestigeBand).toBe("Elite");
    });

    it("should return Legendary for prestige >= 80", () => {
      const heya = makeMockHeya("h1", { prestige: 85 });
      const world = makeMockWorld();

      mockGetOyakataForHeya.mockReturnValue(undefined);
      mockGetHeyaStaff.mockReturnValue([]);
      mockGetHeyaStyleBias.mockReturnValue("neutral" as Style);

      const result = projectHeya(heya, world);

      expect(result.prestigeBand).toBe("Legendary");
    });

    it("should return Legendary for prestige exactly 80", () => {
      const heya = makeMockHeya("h1", { prestige: 80 });
      const world = makeMockWorld();

      mockGetOyakataForHeya.mockReturnValue(undefined);
      mockGetHeyaStaff.mockReturnValue([]);
      mockGetHeyaStyleBias.mockReturnValue("neutral" as Style);

      const result = projectHeya(heya, world);

      expect(result.prestigeBand).toBe("Legendary");
    });
  });

  describe("Style Bias Integration", () => {
    it("should call getHeyaStyleBias and return result", () => {
      const heya = makeMockHeya("h1");
      const world = makeMockWorld();

      mockGetOyakataForHeya.mockReturnValue(undefined);
      mockGetHeyaStaff.mockReturnValue([]);
      mockGetHeyaStyleBias.mockReturnValue("oshi" as Style);

      const result = projectHeya(heya, world);

      expect(result.styleBias).toBe("oshi");
      expect(getHeyaStyleBias).toHaveBeenCalledWith(world, "h1");
    });

    it("should return neutral when style bias is neutral", () => {
      const heya = makeMockHeya("h1");
      const world = makeMockWorld();

      mockGetOyakataForHeya.mockReturnValue(undefined);
      mockGetHeyaStaff.mockReturnValue([]);
      mockGetHeyaStyleBias.mockReturnValue("neutral" as Style);

      const result = projectHeya(heya, world);

      expect(result.styleBias).toBe("neutral");
    });
  });

  describe("NPC Scouting Priority", () => {
    it("should read from world.npcScoutingPriorities[heyaId]", () => {
      const heya = makeMockHeya("h1");
      const world = makeMockWorld({
        npcScoutingPriorities: { h1: "aggressive" },
      });

      mockGetOyakataForHeya.mockReturnValue(undefined);
      mockGetHeyaStaff.mockReturnValue([]);
      mockGetHeyaStyleBias.mockReturnValue("neutral" as Style);

      const result = projectHeya(heya, world);

      expect(result.recruitment.scoutingPriority).toBe("aggressive");
    });

    it("should default to passive when not set", () => {
      const heya = makeMockHeya("h1");
      const world = makeMockWorld({
        npcScoutingPriorities: {},
      });

      mockGetOyakataForHeya.mockReturnValue(undefined);
      mockGetHeyaStaff.mockReturnValue([]);
      mockGetHeyaStyleBias.mockReturnValue("neutral" as Style);

      const result = projectHeya(heya, world);

      expect(result.recruitment.scoutingPriority).toBe("passive");
    });

    it("should default to passive when npcScoutingPriorities is undefined", () => {
      const heya = makeMockHeya("h1");
      const world = makeMockWorld({
        npcScoutingPriorities: undefined,
      });

      mockGetOyakataForHeya.mockReturnValue(undefined);
      mockGetHeyaStaff.mockReturnValue([]);
      mockGetHeyaStyleBias.mockReturnValue("neutral" as Style);

      const result = projectHeya(heya, world);

      expect(result.recruitment.scoutingPriority).toBe("passive");
    });
  });

  describe("Recruitment Calculation", () => {
    it("should calculate openSlots as Math.max(0, 30 - roster.length)", () => {
      const rikishi1 = mockRikishi("r1", { shikona: "Rikishi A", heyaId: "h1" });
      const rikishi2 = mockRikishi("r2", { shikona: "Rikishi B", heyaId: "h1" });

      const heya = makeMockHeya("h1", { rikishiIds: ["r1", "r2"] });
      const world = makeMockWorld({
        rikishi: new Map([
          ["r1", rikishi1],
          ["r2", rikishi2],
        ]),
      });

      mockGetOyakataForHeya.mockReturnValue(undefined);
      mockGetHeyaStaff.mockReturnValue([]);
      mockGetHeyaStyleBias.mockReturnValue("neutral" as Style);

      const result = projectHeya(heya, world);

      expect(result.recruitment.openSlots).toBe(28); // 30 - 2
    });

    it("should set targetStyle to neutral (hardcoded)", () => {
      const heya = makeMockHeya("h1");
      const world = makeMockWorld();

      mockGetOyakataForHeya.mockReturnValue(undefined);
      mockGetHeyaStaff.mockReturnValue([]);
      mockGetHeyaStyleBias.mockReturnValue("neutral" as Style);

      const result = projectHeya(heya, world);

      expect(result.recruitment.targetStyle).toBe("neutral");
    });

    it("should set scoutingPriority from npcScoutingPriorities", () => {
      const heya = makeMockHeya("h1");
      const world = makeMockWorld({
        npcScoutingPriorities: { h1: "active" },
      });

      mockGetOyakataForHeya.mockReturnValue(undefined);
      mockGetHeyaStaff.mockReturnValue([]);
      mockGetHeyaStyleBias.mockReturnValue("neutral" as Style);

      const result = projectHeya(heya, world);

      expect(result.recruitment.scoutingPriority).toBe("active");
    });

    it("should handle roster at capacity (openSlots = 0)", () => {
      // Create 30 rikishi
      const rikishiMap = new Map();
      const rikishiIds = [];
      for (let i = 0; i < 30; i++) {
        const id = `r${i}`;
        rikishiMap.set(id, mockRikishi(id, { shikona: `Rikishi ${i}`, heyaId: "h1" }));
        rikishiIds.push(id);
      }

      const heya = makeMockHeya("h1", { rikishiIds });
      const world = makeMockWorld({ rikishi: rikishiMap });

      mockGetOyakataForHeya.mockReturnValue(undefined);
      mockGetHeyaStaff.mockReturnValue([]);
      mockGetHeyaStyleBias.mockReturnValue("neutral" as Style);

      const result = projectHeya(heya, world);

      expect(result.recruitment.openSlots).toBe(0);
    });

    it("should handle over-capacity roster (openSlots = 0)", () => {
      // Create 35 rikishi (over capacity)
      const rikishiMap = new Map();
      const rikishiIds = [];
      for (let i = 0; i < 35; i++) {
        const id = `r${i}`;
        rikishiMap.set(id, mockRikishi(id, { shikona: `Rikishi ${i}`, heyaId: "h1" }));
        rikishiIds.push(id);
      }

      const heya = makeMockHeya("h1", { rikishiIds });
      const world = makeMockWorld({ rikishi: rikishiMap });

      mockGetOyakataForHeya.mockReturnValue(undefined);
      mockGetHeyaStaff.mockReturnValue([]);
      mockGetHeyaStyleBias.mockReturnValue("neutral" as Style);

      const result = projectHeya(heya, world);

      expect(result.recruitment.openSlots).toBe(0); // Math.max(0, 30 - 35) = 0
    });
  });

  describe("Hardcoded Values", () => {
    it("should set monthlyExpense to 0", () => {
      const heya = makeMockHeya("h1");
      const world = makeMockWorld();

      mockGetOyakataForHeya.mockReturnValue(undefined);
      mockGetHeyaStaff.mockReturnValue([]);
      mockGetHeyaStyleBias.mockReturnValue("neutral" as Style);

      const result = projectHeya(heya, world);

      expect(result.monthlyExpense).toBe(0);
    });

    it("should set rosterLimit to 30", () => {
      const heya = makeMockHeya("h1");
      const world = makeMockWorld();

      mockGetOyakataForHeya.mockReturnValue(undefined);
      mockGetHeyaStaff.mockReturnValue([]);
      mockGetHeyaStyleBias.mockReturnValue("neutral" as Style);

      const result = projectHeya(heya, world);

      expect(result.rosterLimit).toBe(30);
    });

    it("should set achievements.yushoCount to 0", () => {
      const heya = makeMockHeya("h1");
      const world = makeMockWorld();

      mockGetOyakataForHeya.mockReturnValue(undefined);
      mockGetHeyaStaff.mockReturnValue([]);
      mockGetHeyaStyleBias.mockReturnValue("neutral" as Style);

      const result = projectHeya(heya, world);

      expect(result.achievements.yushoCount).toBe(0);
    });

    it("should set achievements.specialPrizeCount to 0", () => {
      const heya = makeMockHeya("h1");
      const world = makeMockWorld();

      mockGetOyakataForHeya.mockReturnValue(undefined);
      mockGetHeyaStaff.mockReturnValue([]);
      mockGetHeyaStyleBias.mockReturnValue("neutral" as Style);

      const result = projectHeya(heya, world);

      expect(result.achievements.specialPrizeCount).toBe(0);
    });

    it("should set rivalStableIds to empty array", () => {
      const heya = makeMockHeya("h1");
      const world = makeMockWorld();

      mockGetOyakataForHeya.mockReturnValue(undefined);
      mockGetHeyaStaff.mockReturnValue([]);
      mockGetHeyaStyleBias.mockReturnValue("neutral" as Style);

      const result = projectHeya(heya, world);

      expect(result.rivalStableIds).toEqual([]);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty rikishiIds array", () => {
      const heya = makeMockHeya("h1", { rikishiIds: [] });
      const world = makeMockWorld();

      mockGetOyakataForHeya.mockReturnValue(undefined);
      mockGetHeyaStaff.mockReturnValue([]);
      mockGetHeyaStyleBias.mockReturnValue("neutral" as Style);

      const result = projectHeya(heya, world);

      expect(result.roster).toHaveLength(0);
      expect(result.rosterSize).toBe(0);
      expect(result.recruitment.openSlots).toBe(30);
    });

    it("should handle empty staffIds array", () => {
      const heya = makeMockHeya("h1", { staffIds: [] });
      const world = makeMockWorld();

      mockGetOyakataForHeya.mockReturnValue(undefined);
      mockGetHeyaStaff.mockReturnValue([]);
      mockGetHeyaStyleBias.mockReturnValue("neutral" as Style);

      const result = projectHeya(heya, world);

      expect(result.staff).toHaveLength(0);
    });

    it("should handle missing optional heya fields", () => {
      const heya = makeMockHeya("h1", {
        location: undefined,
        ichimon: undefined,
        prestige: undefined,
        funds: undefined,
      });
      const world = makeMockWorld();

      mockGetOyakataForHeya.mockReturnValue(undefined);
      mockGetHeyaStaff.mockReturnValue([]);
      mockGetHeyaStyleBias.mockReturnValue("neutral" as Style);

      const result = projectHeya(heya, world);

      expect(result.location).toBe("Tokyo");
      expect(result.ichimon).toBe("Independent");
      expect(result.prestige).toBeUndefined(); // undefined passes through
      expect(result.funds).toBe(0); // undefined defaults to 0 in projection
    });

    it("should handle undefined world.npcScoutingPriorities", () => {
      const heya = makeMockHeya("h1");
      const world = makeMockWorld({ npcScoutingPriorities: undefined });

      mockGetOyakataForHeya.mockReturnValue(undefined);
      mockGetHeyaStaff.mockReturnValue([]);
      mockGetHeyaStyleBias.mockReturnValue("neutral" as Style);

      const result = projectHeya(heya, world);

      expect(result.recruitment.scoutingPriority).toBe("passive");
    });

    it("should handle funds defaulting to 0 when not set", () => {
      const heya = makeMockHeya("h1", { funds: undefined });
      const world = makeMockWorld();

      mockGetOyakataForHeya.mockReturnValue(undefined);
      mockGetHeyaStaff.mockReturnValue([]);
      mockGetHeyaStyleBias.mockReturnValue("neutral" as Style);

      const result = projectHeya(heya, world);

      expect(result.funds).toBe(0);
    });
  });
});
