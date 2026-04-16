/**
 * dashboardProjections.test.ts
 *
 * Tests for dashboard projection functions.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect } from "vitest";
import {
  projectDashboardUIDigest,
  projectBanzukeUIDigest,
} from "../../../presenters/projections/dashboardProjections";
import { createMockWorldState, createMockHeya } from "../../utils/testHelpers";

describe("dashboardProjections", () => {
  describe("projectDashboardUIDigest", () => {
    it("should return null when player heya not set", () => {
      const world = createMockWorldState({ playerHeyaId: undefined }) as any;
      const result = projectDashboardUIDigest(world);
      expect(result).toBeNull();
    });

    it("should return null when player heya not found", () => {
      const world = createMockWorldState({ playerHeyaId: "non-existent" }) as any;
      const result = projectDashboardUIDigest(world);
      expect(result).toBeNull();
    });

    it("should return dashboard data when player heya exists", () => {
      const world = createMockWorldState({ playerHeyaId: "heya-1" }) as any;
      const heya = createMockHeya({ id: "heya-1" });
      world.heyas.set("heya-1", heya);

      const result = projectDashboardUIDigest(world);
      expect(result).not.toBeNull();
      expect(result?.heya).toBeDefined();
      expect(result?.stats).toBeDefined();
    });
  });

  describe("projectBanzukeUIDigest", () => {
    it("should return banzuke data", () => {
      const world = createMockWorldState({ year: 2025 }) as any;
      const result = projectBanzukeUIDigest(world);
      expect(result).toBeDefined();
      expect(result.year).toBe(2025);
      expect(result.divisions).toBeDefined();
    });
  });
});
