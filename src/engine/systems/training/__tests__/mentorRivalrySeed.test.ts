/**
 * src/engine/systems/training/__tests__/mentorRivalrySeed.test.ts
 * ============================================================
 * Unit tests for mentor-mentee bout event generation.
 *
 * Tests cover:
 * - Event generation when mentor faces apprentice
 * - Null return for unrelated rikishi
 * - Bidirectional check (mentor as east or west)
 */

import { describe, it, expect } from "vitest";
import { checkMentorMenteeBout } from "../MentorshipService";
import { mockRikishi } from "../../../__tests__/utils";

describe("Mentor-Mentee Bout Event Generation", () => {
  /**
   * Test: Generates event when mentor faces apprentice (mentor as east).
   * Validates that the event is generated with correct mentor/apprentice IDs.
   */
  it("generates event when mentor faces apprentice (mentor as east)", () => {
    const mentor = mockRikishi("mentor1", { rank: "ozeki" });
    mentor.menteeIds = ["app1"];

    const apprentice = mockRikishi("app1", { rank: "maegashira" });
    apprentice.mentorId = "mentor1";

    const event = checkMentorMenteeBout(mentor, apprentice);

    expect(event).not.toBeNull();
    expect(event?.type).toBe("mentor_mentee_bout");
    expect(event?.mentorId).toBe("mentor1");
    expect(event?.apprenticeId).toBe("app1");
  });

  /**
   * Test: Generates event when apprentice faces mentor (apprentice as east).
   * Validates that the bidirectional check works regardless of position.
   */
  it("generates event when apprentice faces mentor (apprentice as east)", () => {
    const mentor = mockRikishi("mentor1", { rank: "ozeki" });
    mentor.menteeIds = ["app1"];

    const apprentice = mockRikishi("app1", { rank: "maegashira" });
    apprentice.mentorId = "mentor1";

    const event = checkMentorMenteeBout(apprentice, mentor);

    expect(event).not.toBeNull();
    expect(event?.type).toBe("mentor_mentee_bout");
    expect(event?.mentorId).toBe("mentor1");
    expect(event?.apprenticeId).toBe("app1");
  });

  /**
   * Test: Returns null for unrelated rikishi.
   * Validates that no event is generated when there is no mentor-mentee relationship.
   */
  it("returns null for unrelated rikishi", () => {
    const rikishiA = mockRikishi("r1", { rank: "ozeki" });
    const rikishiB = mockRikishi("r2", { rank: "maegashira" });

    const event = checkMentorMenteeBout(rikishiA, rikishiB);

    expect(event).toBeNull();
  });

  /**
   * Test: Returns null when mentor has no mentees.
   * Validates that the check doesn't generate events for mentors without apprentices.
   */
  it("returns null when mentor has no mentees", () => {
    const mentor = mockRikishi("mentor1", { rank: "ozeki" });
    mentor.menteeIds = undefined;

    const apprentice = mockRikishi("app1", { rank: "maegashira" });

    const event = checkMentorMenteeBout(mentor, apprentice);

    expect(event).toBeNull();
  });

  /**
   * Test: Returns null when apprentice has no mentor.
   * Validates that no event is generated when apprentice lacks mentorId.
   */
  it("returns null when apprentice has no mentor", () => {
    const mentor = mockRikishi("mentor1", { rank: "ozeki" });
    mentor.menteeIds = ["app1"];

    const apprentice = mockRikishi("app1", { rank: "maegashira" });
    // apprentice has no mentorId

    const event = checkMentorMenteeBout(mentor, apprentice);

    expect(event).toBeNull();
  });

  /**
   * Test: Returns null when rikishi faces themselves.
   * Validates that self-bouts don't generate mentor-mentee events.
   */
  it("returns null when rikishi faces themselves", () => {
    const rikishi = mockRikishi("r1", { rank: "ozeki" });
    rikishi.menteeIds = ["r1"]; // Invalid state, but test robustness

    const event = checkMentorMenteeBout(rikishi, rikishi);

    expect(event).toBeNull();
  });
});
