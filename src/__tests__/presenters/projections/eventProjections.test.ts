/**
 * eventProjections.test.ts
 *
 * Tests for event projection functions.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect } from "vitest";
import {
  projectEventLogData,
  projectGovernanceSummary,
  projectBashoResults,
  projectPressConferenceData,
  projectPlayerContext,
} from "../../../presenters/projections/eventProjections";
import { createMockWorldState, createMockHeya } from "../../utils/testHelpers";

describe("eventProjections", () => {
  describe("projectEventLogData", () => {
    it("should return event log data", () => {
      const world = createMockWorldState() as any;
      const result = projectEventLogData(world);
      expect(result).toBeDefined();
      expect(result.events).toBeDefined();
      expect(result.getRikishi).toBeDefined();
      expect(result.getHeya).toBeDefined();
    });
  });

  describe("projectGovernanceSummary", () => {
    it("should return governance summary", () => {
      const world = createMockWorldState({ year: 2025 }) as any;
      const result = projectGovernanceSummary(world);
      expect(result).toBeDefined();
      expect(result.year).toBe(2025);
      expect(result.heyasCount).toBeDefined();
    });
  });

  describe("projectBashoResults", () => {
    it("should return basho results", () => {
      const world = createMockWorldState() as any;
      const lastBasho = { yusho: "rikishi-1" };
      const result = projectBashoResults(world, lastBasho);
      expect(result).toBeDefined();
    });
  });

  describe("projectPressConferenceData", () => {
    it("should return null when player heya not found", () => {
      const world = createMockWorldState({ playerHeyaId: "non-existent" }) as any;
      const result = projectPressConferenceData(world);
      expect(result).toBeNull();
    });

    it("should return press conference data when player heya exists", () => {
      const world = createMockWorldState({ playerHeyaId: "heya-1" }) as any;
      const heya = createMockHeya({ id: "heya-1", rikishiIds: ["rikishi-1"] });
      world.heyas.set("heya-1", heya);
      world.history = [];

      const result = projectPressConferenceData(world);
      expect(result).not.toBeNull();
    });
  });

  describe("projectPlayerContext", () => {
    it("should return player context", () => {
      const world = createMockWorldState({ playerHeyaId: "heya-1" }) as any;
      const result = projectPlayerContext(world);
      expect(result).toBeDefined();
      expect(result.playerHeyaId).toBe("heya-1");
    });
  });
});
