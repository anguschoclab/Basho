/**
 * heyaProjections.test.ts
 *
 * Tests for heya projection functions.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect } from "vitest";
import {
  projectHeyaData,
  projectHeyaRosterWithAge,
} from "../../../presenters/projections/heyaProjections";
import { createMockWorldState, createMockHeya, createMockRikishi } from "../../utils/testHelpers";

describe("heyaProjections", () => {
  describe("projectHeyaData", () => {
    it("should return null when heya not found", () => {
      const world = createMockWorldState() as any;
      const result = projectHeyaData(world, "non-existent");
      expect(result).toBeNull();
    });

    it("should return heya data when found", () => {
      const world = createMockWorldState() as any;
      const heya = createMockHeya({ id: "heya-1", oyakataId: "oyakata-1" });
      const oyakata = { id: "oyakata-1", traits: {} };
      world.heyas.set("heya-1", heya);
      world.oyakata.set("oyakata-1", oyakata);

      const result = projectHeyaData(world, "heya-1");
      expect(result).not.toBeNull();
      expect(result?.heya).toBe(heya);
      expect(result?.oyakata).toBe(oyakata);
    });
  });

  describe("projectHeyaRosterWithAge", () => {
    it("should return empty array when heya not found", () => {
      const world = createMockWorldState() as any;
      const result = projectHeyaRosterWithAge(world, "non-existent");
      expect(result).toHaveLength(0);
    });

    it("should return roster with calculated ages", () => {
      const world = createMockWorldState({ year: 2025 }) as any;
      const heya = createMockHeya({ id: "heya-1", rikishiIds: ["rikishi-1"] });
      const rikishi = createMockRikishi({ id: "rikishi-1", heyaId: "heya-1", birthYear: 2000 });

      world.heyas.set("heya-1", heya);
      world.rikishi.set("rikishi-1", rikishi);

      const result = projectHeyaRosterWithAge(world, "heya-1");
      expect(result).toHaveLength(1);
      expect(result[0].age).toBe(25);
    });
  });
});
