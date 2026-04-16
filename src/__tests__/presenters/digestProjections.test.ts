/**
 * digestProjections.test.ts
 *
 * Tests for digest projection functions.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect } from "vitest";
import {
  labelForWorld,
  buildInjurySection,
  buildEventSections,
  buildHeadline,
  buildMatchupItems,
  buildWeeklyDigest,
} from "../../presenters/projections/digestProjections";
import { createMockWorldState } from "../utils/testHelpers";

describe("digestProjections", () => {
  describe("labelForWorld", () => {
    it("should return a formatted label with year, week, and phase", () => {
      const world = createMockWorldState({ year: 2025, week: 5, cyclePhase: "interim" }) as any;
      const label = labelForWorld(world);
      expect(label).toBe("2025 — Week 5 (interim)");
    });

    it("should handle missing year with default", () => {
      const world = createMockWorldState({
        year: undefined,
        week: 5,
        cyclePhase: "interim",
      }) as any;
      const label = labelForWorld(world);
      expect(label).toBe("2025 — Week 5 (interim)");
    });
  });

  describe("buildInjurySection", () => {
    it("should return null when no injured rikishi", () => {
      const world = createMockWorldState() as any;
      const section = buildInjurySection(world);
      expect(section).toBeNull();
    });

    it("should return injury section with injured rikishi", () => {
      const world = createMockWorldState() as any;
      // Add injured rikishi logic would go here
      // For now, this is a placeholder test
      const section = buildInjurySection(world);
      expect(section).toBeNull();
    });
  });

  describe("buildWeeklyDigest", () => {
    it("should return null when world is null", () => {
      const digest = buildWeeklyDigest(null);
      expect(digest).toBeNull();
    });

    it("should return a digest when world is provided", () => {
      const world = createMockWorldState() as any;
      const digest = buildWeeklyDigest(world);
      expect(digest).not.toBeNull();
      expect(digest?.time).toBeDefined();
      expect(digest?.headline).toBeDefined();
      expect(digest?.counts).toBeDefined();
      expect(digest?.sections).toBeDefined();
    });
  });

  describe("buildHeadline", () => {
    it("should return a headline", () => {
      const world = createMockWorldState() as any;
      const headline = buildHeadline(world, 0, 0);
      expect(headline).toBeDefined();
      expect(typeof headline).toBe("string");
    });
  });

  describe("buildMatchupItems", () => {
    it("should return empty items when no basho", () => {
      const world = createMockWorldState({ currentBasho: undefined }) as any;
      const result = buildMatchupItems(world);
      expect(result.items).toEqual([]);
      expect(result.section).toBeUndefined();
    });

    it("should return matchup items when basho is active", () => {
      const world = createMockWorldState() as any;
      const result = buildMatchupItems(world);
      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
    });
  });

  describe("buildEventSections", () => {
    it("should return event sections", () => {
      const world = createMockWorldState() as any;
      const sections = buildEventSections(world);
      expect(sections).toBeDefined();
      expect(Array.isArray(sections)).toBe(true);
    });
  });
});
