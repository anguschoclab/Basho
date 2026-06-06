/**
 * src/engine/systems/training/__tests__/mentorshipTick.test.ts
 * ============================================================
 * Integration tests for mentorship bonuses in weekly training tick.
 *
 * Tests cover:
 * - Technique bleed application to apprentice
 * - Adaptability penalty application to apprentice
 * - Integration with phase01_week_training
 */

import { describe, it, expect } from "vitest";
import { applyMentorshipBonuses } from "../MentorshipService";
import { mockRikishi, makeMockWorld } from "../../../__tests__/utils";

describe("Mentorship Tick Integration", () => {
  /**
   * Test: Applies technique bleed to apprentice with mentor.
   * Validates that apprentices receive technique points from mentors.
   */
  it("applies technique bleed to apprentice with mentor", () => {
    const mentor = mockRikishi("mentor1", {
      rank: "ozeki",
      technique: 90,
      heyaId: "heya1",
    });
    mentor.menteeIds = ["app1"];

    const apprentice = mockRikishi("app1", {
      rank: "jonokuchi",
      technique: 40,
      heyaId: "heya1",
    });
    apprentice.mentorId = "mentor1";

    const world = makeMockWorld({
      rikishi: new Map([
        [mentor.id, mentor],
        [apprentice.id, apprentice],
      ]),
    });

    const impact = applyMentorshipBonuses(world);
    const appUpdate = impact.entities?.rikishiUpdates?.get(apprentice.id);

    expect(appUpdate).toBeDefined();
    expect(appUpdate?.stats?.technique).toBeGreaterThan(40);
    expect(appUpdate?.stats?.technique).toBeLessThanOrEqual(43); // max 3 points
  });

  /**
   * Test: Applies adaptability penalty to apprentice with mentor.
   * Validates that apprentices receive adaptability penalty from mentors.
   */
  it("applies adaptability penalty to apprentice with mentor", () => {
    const mentor = mockRikishi("mentor1", {
      rank: "ozeki",
      technique: 90,
      heyaId: "heya1",
    });
    mentor.menteeIds = ["app1"];

    const apprentice = mockRikishi("app1", {
      rank: "jonokuchi",
      technique: 40,
      adaptability: 50,
      heyaId: "heya1",
    });
    apprentice.mentorId = "mentor1";

    const world = makeMockWorld({
      rikishi: new Map([
        [mentor.id, mentor],
        [apprentice.id, apprentice],
      ]),
    });

    const impact = applyMentorshipBonuses(world);
    const appUpdate = impact.entities?.rikishiUpdates?.get(apprentice.id);

    expect(appUpdate).toBeDefined();
    expect(appUpdate?.stats?.adaptability).toBe(49); // -1 penalty
  });

  /**
   * Test: Skips apprentices with no mentor.
   * Validates that apprentices without mentors receive no bonuses.
   */
  it("skips apprentices with no mentor", () => {
    const apprentice = mockRikishi("app1", {
      rank: "jonokuchi",
      technique: 40,
      adaptability: 50,
      heyaId: "heya1",
    });

    const world = makeMockWorld({
      rikishi: new Map([[apprentice.id, apprentice]]),
    });

    const impact = applyMentorshipBonuses(world);
    const appUpdate = impact.entities?.rikishiUpdates?.get(apprentice.id);

    expect(appUpdate).toBeUndefined();
  });

  /**
   * Test: Skips ineligible mentorship (cross-heya).
   * Validates that cross-heya mentorships don't apply bonuses.
   */
  it("skips ineligible mentorship (cross-heya)", () => {
    const mentor = mockRikishi("mentor1", {
      rank: "ozeki",
      technique: 90,
      heyaId: "heya1",
    });
    mentor.menteeIds = ["app1"];

    const apprentice = mockRikishi("app1", {
      rank: "jonokuchi",
      technique: 40,
      heyaId: "heya2", // Different heya
    });
    apprentice.mentorId = "mentor1";

    const world = makeMockWorld({
      rikishi: new Map([
        [mentor.id, mentor],
        [apprentice.id, apprentice],
      ]),
    });

    const impact = applyMentorshipBonuses(world);
    const appUpdate = impact.entities?.rikishiUpdates?.get(apprentice.id);

    expect(appUpdate).toBeUndefined();
  });

  /**
   * Test: Skips ineligible mentorship (mentor below juryo).
   * Validates that only sekitori can be mentors.
   */
  it("skips ineligible mentorship (mentor below juryo)", () => {
    const mentor = mockRikishi("mentor1", {
      rank: "makushita",
      technique: 90,
      heyaId: "heya1",
    });
    mentor.menteeIds = ["app1"];

    const apprentice = mockRikishi("app1", {
      rank: "jonokuchi",
      technique: 40,
      heyaId: "heya1",
    });
    apprentice.mentorId = "mentor1";

    const world = makeMockWorld({
      rikishi: new Map([
        [mentor.id, mentor],
        [apprentice.id, apprentice],
      ]),
    });

    const impact = applyMentorshipBonuses(world);
    const appUpdate = impact.entities?.rikishiUpdates?.get(apprentice.id);

    expect(appUpdate).toBeUndefined();
  });

  /**
   * Test: Skips when technique gap is below threshold.
   * Validates that small technique gaps don't trigger bleed.
   */
  it("skips when technique gap is below threshold", () => {
    const mentor = mockRikishi("mentor1", {
      rank: "ozeki",
      technique: 70,
      heyaId: "heya1",
    });
    mentor.menteeIds = ["app1"];

    const apprentice = mockRikishi("app1", {
      rank: "juryo",
      technique: 68, // Gap of 2, below threshold of 10
      heyaId: "heya1",
    });
    apprentice.mentorId = "mentor1";

    const world = makeMockWorld({
      rikishi: new Map([
        [mentor.id, mentor],
        [apprentice.id, apprentice],
      ]),
    });

    const impact = applyMentorshipBonuses(world);
    const appUpdate = impact.entities?.rikishiUpdates?.get(apprentice.id);

    expect(appUpdate).toBeUndefined();
  });
});
