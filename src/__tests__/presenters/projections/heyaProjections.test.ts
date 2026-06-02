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

    it("returns undefined oyakata when oyakataId not in map", () => {
      const world = createMockWorldState() as any;
      const heya = createMockHeya({ id: "heya-1", oyakataId: "missing-oyakata" });
      world.heyas.set("heya-1", heya);

      const result = projectHeyaData(world, "heya-1");
      expect(result?.oyakata).toBeUndefined();
      expect(result?.oyakataQuirks).toEqual([]);
    });

    it("returns empty oyakataQuirks when oyakata has no quirks field", () => {
      const world = createMockWorldState() as any;
      const heya = createMockHeya({ id: "heya-1", oyakataId: "oy1" });
      const oyakata = { id: "oy1", traits: { ambition: 50 } };
      world.heyas.set("heya-1", heya);
      world.oyakata.set("oy1", oyakata);

      const result = projectHeyaData(world, "heya-1");
      expect(result?.oyakataQuirks).toEqual([]);
    });

    it("forwards oyakataQuirks when oyakata has quirks", () => {
      const world = createMockWorldState() as any;
      const heya = createMockHeya({ id: "heya-1", oyakataId: "oy1" });
      const oyakata = { id: "oy1", quirks: ["assertive", "stubborn"], traits: {} };
      world.heyas.set("heya-1", heya);
      world.oyakata.set("oy1", oyakata);

      const result = projectHeyaData(world, "heya-1");
      expect(result?.oyakataQuirks).toEqual(["assertive", "stubborn"]);
    });

    it("forwards oyakataTraits when present", () => {
      const world = createMockWorldState() as any;
      const heya = createMockHeya({ id: "heya-1", oyakataId: "oy1" });
      const traits = { ambition: 80, patience: 40, risk: 60, tradition: 50, compassion: 70 };
      const oyakata = { id: "oy1", traits };
      world.heyas.set("heya-1", heya);
      world.oyakata.set("oy1", oyakata);

      const result = projectHeyaData(world, "heya-1");
      expect(result?.oyakataTraits).toBe(traits);
    });

    it("oyakataTraits is undefined when oyakata has no traits", () => {
      const world = createMockWorldState() as any;
      const heya = createMockHeya({ id: "heya-1", oyakataId: "oy1" });
      const oyakata = { id: "oy1" };
      world.heyas.set("heya-1", heya);
      world.oyakata.set("oy1", oyakata);

      const result = projectHeyaData(world, "heya-1");
      expect(result?.oyakataTraits).toBeUndefined();
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

    it("filters out rikishi IDs that are not in world.rikishi map", () => {
      const world = createMockWorldState({ year: 2025 }) as any;
      const heya = createMockHeya({ id: "heya-1", rikishiIds: ["real-r", "ghost-r"] });
      const rikishi = createMockRikishi({ id: "real-r", heyaId: "heya-1", birthYear: 2000 });

      world.heyas.set("heya-1", heya);
      world.rikishi.set("real-r", rikishi);

      const result = projectHeyaRosterWithAge(world, "heya-1");
      expect(result).toHaveLength(1);
      expect(result[0].rikishi.id).toBe("real-r");
    });

    it("returns age 0 when birthYear is 0", () => {
      const world = createMockWorldState({ year: 2025 }) as any;
      const heya = createMockHeya({ id: "heya-1", rikishiIds: ["r1"] });
      const rikishi = createMockRikishi({ id: "r1", heyaId: "heya-1", birthYear: 0 });

      world.heyas.set("heya-1", heya);
      world.rikishi.set("r1", rikishi);

      const result = projectHeyaRosterWithAge(world, "heya-1");
      expect(result[0].age).toBe(0);
    });

    it("returns age 0 when world.year is undefined", () => {
      const world = createMockWorldState({ year: undefined }) as any;
      const heya = createMockHeya({ id: "heya-1", rikishiIds: ["r1"] });
      const rikishi = createMockRikishi({ id: "r1", heyaId: "heya-1", birthYear: 1995 });

      world.heyas.set("heya-1", heya);
      world.rikishi.set("r1", rikishi);

      const result = projectHeyaRosterWithAge(world, "heya-1");
      expect(result[0].age).toBe(0);
    });
  });
});
