/**
 * bashoProjections.test.ts
 *
 * Tests for basho projection functions.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect } from "vitest";
import { projectBashoUIDigest } from "../../../presenters/projections/bashoProjections";
import { createMockWorldState, createMockHeya } from "../../utils/testHelpers";

describe("bashoProjections", () => {
  describe("projectBashoUIDigest", () => {
    it("should return null when no current basho", () => {
      const world = createMockWorldState({ currentBasho: undefined }) as any;
      const result = projectBashoUIDigest(world);
      expect(result).toBeNull();
    });

    it("should return basho data when basho exists", () => {
      const world = createMockWorldState({ playerHeyaId: "heya-1" }) as any;
      const heya = createMockHeya({ id: "heya-1", rikishiIds: ["rikishi-1"] });
      // bashoName must be a valid BASHO_CALENDAR key (BashoName type); display name comes from the calendar
      const basho = { bashoName: "hatsu", day: 5, matches: [], standings: new Map() };

      world.heyas.set("heya-1", heya);
      world.currentBasho = basho;

      const result = projectBashoUIDigest(world);
      expect(result).not.toBeNull();
      expect(result?.bashoName).toBe("hatsu");
      expect(result?.day).toBe(5);
    });
  });
});
