/**
 * src/engine/systems/training/__tests__/mentorAssignment.test.ts
 * ============================================================
 * Unit tests for mentor assignment and removal mutations.
 *
 * Tests cover:
 * - Successful mentor assignment
 * - Failed mentor assignment (ineligible pairs)
 * - Mentor removal
 * - Null safety for menteeIds array
 */

import { describe, it, expect } from "vitest";
import { assignMentor, removeMentor } from "../MentorshipService";
import { mockRikishi, makeMockWorld } from "../../../__tests__/utils";

describe("Mentor Assignment", () => {
  /**
   * Test: Assigns mentor to eligible apprentice.
   * Validates that mentorId is set on apprentice and apprenticeId added to mentor's menteeIds.
   */
  it("assigns mentor to eligible apprentice", () => {
    const mentor = mockRikishi("mentor1", { rank: "ozeki", heyaId: "heya1" });
    const apprentice = mockRikishi("app1", { rank: "jonokuchi", heyaId: "heya1" });

    const world = makeMockWorld({
      rikishi: new Map([[mentor.id, mentor], [apprentice.id, apprentice]]),
    });

    const impact = assignMentor(world, mentor.id, apprentice.id);

    const appUpdate = impact.entities?.rikishiUpdates?.get(apprentice.id);
    const mentorUpdate = impact.entities?.rikishiUpdates?.get(mentor.id);

    expect(appUpdate?.mentorId).toBe(mentor.id);
    expect(mentorUpdate?.menteeIds).toContain(apprentice.id);
  });

  /**
   * Test: Handles null menteeIds with null safety.
   * Validates that menteeIds array is created if undefined.
   */
  it("handles null menteeIds with null safety", () => {
    const mentor = mockRikishi("mentor1", { rank: "ozeki", heyaId: "heya1" });
    mentor.menteeIds = undefined; // Explicitly undefined

    const apprentice = mockRikishi("app1", { rank: "jonokuchi", heyaId: "heya1" });

    const world = makeMockWorld({
      rikishi: new Map([[mentor.id, mentor], [apprentice.id, apprentice]]),
    });

    const impact = assignMentor(world, mentor.id, apprentice.id);

    const mentorUpdate = impact.entities?.rikishiUpdates?.get(mentor.id);
    expect(mentorUpdate?.menteeIds).toEqual([apprentice.id]);
  });

  /**
   * Test: Rejects assignment for cross-heya mentorship.
   * Validates that mentor and apprentice must be in same heya.
   */
  it("rejects assignment for cross-heya mentorship", () => {
    const mentor = mockRikishi("mentor1", { rank: "ozeki", heyaId: "heya1" });
    const apprentice = mockRikishi("app1", { rank: "jonokuchi", heyaId: "heya2" });

    const world = makeMockWorld({
      rikishi: new Map([[mentor.id, mentor], [apprentice.id, apprentice]]),
    });

    const impact = assignMentor(world, mentor.id, apprentice.id);

    expect(impact.entities?.rikishiUpdates?.size).toBeUndefined();
  });

  /**
   * Test: Rejects assignment for mentor below juryo rank.
   * Validates that only sekitori can be mentors.
   */
  it("rejects assignment for mentor below juryo rank", () => {
    const mentor = mockRikishi("mentor1", { rank: "makushita", heyaId: "heya1" });
    const apprentice = mockRikishi("app1", { rank: "jonokuchi", heyaId: "heya1" });

    const world = makeMockWorld({
      rikishi: new Map([[mentor.id, mentor], [apprentice.id, apprentice]]),
    });

    const impact = assignMentor(world, mentor.id, apprentice.id);

    expect(impact.entities?.rikishiUpdates?.size).toBeUndefined();
  });

  /**
   * Test: Rejects assignment for retired apprentice.
   * Validates that retired rikishi cannot be apprentices.
   */
  it("rejects assignment for retired apprentice", () => {
    const mentor = mockRikishi("mentor1", { rank: "ozeki", heyaId: "heya1" });
    const apprentice = mockRikishi("app1", { rank: "jonokuchi", heyaId: "heya1", isRetired: true });

    const world = makeMockWorld({
      rikishi: new Map([[mentor.id, mentor], [apprentice.id, apprentice]]),
    });

    const impact = assignMentor(world, mentor.id, apprentice.id);

    expect(impact.entities?.rikishiUpdates?.size).toBeUndefined();
  });

  /**
   * Test: Rejects assignment for injured mentor.
   * Validates that injured rikishi cannot mentor.
   */
  it("rejects assignment for injured mentor", () => {
    const mentor = mockRikishi("mentor1", { rank: "ozeki", heyaId: "heya1", injured: true });
    const apprentice = mockRikishi("app1", { rank: "jonokuchi", heyaId: "heya1" });

    const world = makeMockWorld({
      rikishi: new Map([[mentor.id, mentor], [apprentice.id, apprentice]]),
    });

    const impact = assignMentor(world, mentor.id, apprentice.id);

    expect(impact.entities?.rikishiUpdates?.size).toBeUndefined();
  });

  /**
   * Test: Rejects self-assignment.
   * Validates that a rikishi cannot be their own mentor.
   */
  it("rejects self-assignment", () => {
    const rikishi = mockRikishi("r1", { rank: "ozeki", heyaId: "heya1" });

    const world = makeMockWorld({
      rikishi: new Map([[rikishi.id, rikishi]]),
    });

    const impact = assignMentor(world, rikishi.id, rikishi.id);

    expect(impact.entities?.rikishiUpdates?.size).toBeUndefined();
  });
});

describe("Mentor Removal", () => {
  /**
   * Test: Removes mentor from apprentice.
   * Validates that mentorId is cleared on apprentice and apprenticeId removed from mentor's menteeIds.
   */
  it("removes mentor from apprentice", () => {
    const mentor = mockRikishi("mentor1", { rank: "ozeki", heyaId: "heya1" });
    mentor.menteeIds = ["app1"];

    const apprentice = mockRikishi("app1", { rank: "jonokuchi", heyaId: "heya1" });
    apprentice.mentorId = "mentor1";

    const world = makeMockWorld({
      rikishi: new Map([[mentor.id, mentor], [apprentice.id, apprentice]]),
    });

    const impact = removeMentor(world, apprentice.id);

    const appUpdate = impact.entities?.rikishiUpdates?.get(apprentice.id);
    const mentorUpdate = impact.entities?.rikishiUpdates?.get(mentor.id);

    expect(appUpdate?.mentorId).toBeUndefined();
    expect(mentorUpdate?.menteeIds).not.toContain(apprentice.id);
  });

  /**
   * Test: Handles removal when apprentice has no mentor.
   * Validates that removal is a no-op when no mentor exists.
   */
  it("handles removal when apprentice has no mentor", () => {
    const apprentice = mockRikishi("app1", { rank: "maegashira", heyaId: "heya1" });

    const world = makeMockWorld({
      rikishi: new Map([[apprentice.id, apprentice]]),
    });

    const impact = removeMentor(world, apprentice.id);

    expect(impact.entities?.rikishiUpdates?.size).toBeUndefined();
  });

  /**
   * Test: Handles removal when mentor no longer exists.
   * Validates that removal clears apprentice mentorId even if mentor is gone.
   */
  it("handles removal when mentor no longer exists", () => {
    const apprentice = mockRikishi("app1", { rank: "jonokuchi", heyaId: "heya1" });
    apprentice.mentorId = "nonexistent";

    const world = makeMockWorld({ rikishi: new Map([[apprentice.id, apprentice]]) });

    const impact = removeMentor(world, apprentice.id);

    const appUpdate = impact.entities?.rikishiUpdates?.get(apprentice.id);
    expect(appUpdate?.mentorId).toBeUndefined();
  });

  /**
   * Test: Handles removal when mentor has multiple mentees.
   * Validates that only the specified apprentice is removed from menteeIds.
   */
  it("handles removal when mentor has multiple mentees", () => {
    const mentor = mockRikishi("mentor1", { rank: "ozeki", heyaId: "heya1" });
    mentor.menteeIds = ["app1", "app2", "app3"];

    const app1 = mockRikishi("app1", { rank: "jonokuchi", heyaId: "heya1" });
    app1.mentorId = "mentor1";

    const app2 = mockRikishi("app2", { rank: "jonokuchi", heyaId: "heya1" });
    app2.mentorId = "mentor1";

    const world = makeMockWorld({
      rikishi: new Map([[mentor.id, mentor], [app1.id, app1], [app2.id, app2]]),
    });

    const impact = removeMentor(world, app1.id);

    const mentorUpdate = impact.entities?.rikishiUpdates?.get(mentor.id);
    expect(mentorUpdate?.menteeIds).toEqual(["app2", "app3"]);
  });
});
