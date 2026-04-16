/**
 * boutProjections.test.ts
 *
 * Tests for bout projection functions.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect } from "vitest";
import {
  buildBoutPreviewUI,
  projectRecruitmentUIDigest,
  projectOpponentScoutingUIDigest,
  projectH2HBetweenHeyas,
} from "../../../presenters/projections/boutProjections";
import { createMockWorldState, createMockHeya, createMockRikishi } from "../../utils/testHelpers";

describe("boutProjections", () => {
  describe("buildBoutPreviewUI", () => {
    it("should return null when bout not found", () => {
      const world = createMockWorldState() as any;
      const result = buildBoutPreviewUI("non-existent-bout", world);
      expect(result).toBeNull();
    });
  });

  describe("projectRecruitmentUIDigest", () => {
    it("should return recruitment digest", () => {
      const world = createMockWorldState() as any;
      const result = projectRecruitmentUIDigest(world, "high_school");
      expect(result).toBeDefined();
      expect(result.candidates).toBeDefined();
    });
  });

  describe("projectOpponentScoutingUIDigest", () => {
    it("should return opponent scouting digest", () => {
      const world = createMockWorldState() as any;
      const result = projectOpponentScoutingUIDigest(world, "heya-1", "makuuchi");
      expect(result).toBeDefined();
      expect(result.opponents).toBeDefined();
    });
  });

  describe("projectH2HBetweenHeyas", () => {
    it("should return null when heyas not found", () => {
      const world = createMockWorldState() as any;
      const result = projectH2HBetweenHeyas(world, "non-existent-a", "non-existent-b");
      expect(result).toBeNull();
    });

    it("should return H2H data when heyas exist", () => {
      const world = createMockWorldState() as any;
      const heyaA = createMockHeya({ id: "heya-a", rikishiIds: ["rikishi-1"] });
      const heyaB = createMockHeya({ id: "heya-b", rikishiIds: ["rikishi-2"] });
      const rikishi1 = createMockRikishi({
        id: "rikishi-1",
        heyaId: "heya-a",
        h2h: { "rikishi-2": { wins: 5, losses: 3 } },
      });
      const rikishi2 = createMockRikishi({ id: "rikishi-2", heyaId: "heya-b" });

      world.heyas.set("heya-a", heyaA);
      world.heyas.set("heya-b", heyaB);
      world.rikishi.set("rikishi-1", rikishi1);
      world.rikishi.set("rikishi-2", rikishi2);

      const result = projectH2HBetweenHeyas(world, "heya-a", "heya-b");
      expect(result).not.toBeNull();
      expect(result?.heyaAName).toBe("heya-a");
      expect(result?.heyaBName).toBe("heya-b");
    });
  });
});
