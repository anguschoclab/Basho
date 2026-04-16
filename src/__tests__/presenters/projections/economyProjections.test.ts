/**
 * economyProjections.test.ts
 *
 * Tests for economy projection functions.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect } from "vitest";
import {
  projectLoanStatus,
  projectMergerWarnings,
} from "../../../presenters/projections/economyProjections";
import { createMockWorldState, createMockHeya } from "../../utils/testHelpers";

describe("economyProjections", () => {
  describe("projectLoanStatus", () => {
    it("should return null when heya has no active loans", () => {
      const world = createMockWorldState() as any;
      const heya = createMockHeya({ id: "heya-1", activeLoans: [] });
      world.heyas.set("heya-1", heya);

      const result = projectLoanStatus(world, "heya-1");
      expect(result).toBeNull();
    });

    it("should return null when heya not found", () => {
      const world = createMockWorldState() as any;
      const result = projectLoanStatus(world, "non-existent");
      expect(result).toBeNull();
    });
  });

  describe("projectMergerWarnings", () => {
    it("should return empty array when no heyas at risk", () => {
      const world = createMockWorldState() as any;
      const heya = createMockHeya({
        id: "heya-1",
        funds: 10000,
        rikishiIds: ["rikishi-1", "rikishi-2"],
      });
      world.heyas.set("heya-1", heya);

      const result = projectMergerWarnings(world);
      expect(result).toHaveLength(0);
    });

    it("should return warnings for heyas in debt with small roster", () => {
      const world = createMockWorldState() as any;
      const heya = createMockHeya({ id: "heya-1", funds: -5000, rikishiIds: ["rikishi-1"] });
      world.heyas.set("heya-1", heya);

      const result = projectMergerWarnings(world);
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
