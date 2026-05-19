/**
 * src/engine/systems/training/__tests__/MentorshipService.test.ts
 * ============================================================
 * Unit tests for MentorshipService
 *
 * Tests cover:
 * - Eligibility validation (rank, heya, injury, retirement)
 * - Technique bleed calculation
 * - Adaptability penalty calculation
 */

import { describe, it, expect } from "vitest";
import { MentorshipService } from "../MentorshipService";
import { mockRikishi } from "../../../__tests__/utils";

describe("MentorshipService", () => {
  /**
   * Test: Rejects a mentor below juryo rank.
   * Validates that only sekitori (juryo and above) can be mentors.
   */
  it("rejects a mentor below juryo rank", () => {
    const mentor = mockRikishi("mentor1", { rank: "makushita" });
    const apprentice = mockRikishi("app1", { rank: "jonokuchi", heyaId: "heya1" });
    mentor.heyaId = "heya1";
    expect(MentorshipService.canMentor(mentor, apprentice)).toBe(false);
  });

  /**
   * Test: Accepts a juryo mentor for a lower-division apprentice in the same heya.
   * Validates minimum rank requirement and heya membership.
   */
  it("accepts a juryo mentor for a lower-division apprentice in the same heya", () => {
    const mentor = mockRikishi("mentor1", { rank: "juryo", heyaId: "heya1" });
    const apprentice = mockRikishi("app1", { rank: "jonokuchi", heyaId: "heya1" });
    expect(MentorshipService.canMentor(mentor, apprentice)).toBe(true);
  });

  /**
   * Test: Rejects cross-heya mentorship.
   * Validates that mentors and apprentices must be in the same heya.
   */
  it("rejects cross-heya mentorship", () => {
    const mentor = mockRikishi("mentor1", { rank: "juryo", heyaId: "heya1" });
    const apprentice = mockRikishi("app1", { rank: "jonokuchi", heyaId: "heya2" });
    expect(MentorshipService.canMentor(mentor, apprentice)).toBe(false);
  });

  /**
   * Test: Rejects mentorship when mentor is injured.
   * Validates that injured rikishi cannot mentor.
   */
  it("rejects mentorship when mentor is injured", () => {
    const mentor = mockRikishi("mentor1", { rank: "juryo", heyaId: "heya1", injured: true });
    const apprentice = mockRikishi("app1", { rank: "jonokuchi", heyaId: "heya1" });
    expect(MentorshipService.canMentor(mentor, apprentice)).toBe(false);
  });

  /**
   * Test: Rejects mentorship when mentor is retired.
   * Validates that retired rikishi cannot mentor.
   */
  it("rejects mentorship when mentor is retired", () => {
    const mentor = mockRikishi("mentor1", { rank: "juryo", heyaId: "heya1", isRetired: true });
    const apprentice = mockRikishi("app1", { rank: "jonokuchi", heyaId: "heya1" });
    expect(MentorshipService.canMentor(mentor, apprentice)).toBe(false);
  });

  /**
   * Test: Rejects mentorship when apprentice is retired.
   * Validates that retired rikishi cannot be apprentices.
   */
  it("rejects mentorship when apprentice is retired", () => {
    const mentor = mockRikishi("mentor1", { rank: "juryo", heyaId: "heya1" });
    const apprentice = mockRikishi("app1", { rank: "jonokuchi", heyaId: "heya1", isRetired: true });
    expect(MentorshipService.canMentor(mentor, apprentice)).toBe(false);
  });

  /**
   * Test: Rejects self-mentorship.
   * Validates that a rikishi cannot mentor themselves.
   */
  it("rejects self-mentorship", () => {
    const rikishi = mockRikishi("r1", { rank: "juryo", heyaId: "heya1" });
    expect(MentorshipService.canMentor(rikishi, rikishi)).toBe(false);
  });

  /**
   * Test: Calculates technique bleed proportional to mentor technique.
   * Validates the bleed calculation algorithm with a large technique gap.
   */
  it("calculates technique bleed proportional to mentor technique", () => {
    const mentor = mockRikishi("mentor1", { rank: "ozeki", technique: 90, heyaId: "heya1" });
    const apprentice = mockRikishi("app1", { rank: "jonokuchi", technique: 40, heyaId: "heya1" });
    const bonus = MentorshipService.calculateTechniqueBleed(mentor, apprentice);
    expect(bonus).toBeGreaterThan(0);
    expect(bonus).toBeLessThanOrEqual(3); // max 3 points per week
  });

  /**
   * Test: Returns 0 bleed when apprentice technique is close to mentor.
   * Validates the BLEED_THRESHOLD prevents bleed for small gaps.
   */
  it("returns 0 bleed when apprentice technique is close to mentor", () => {
    const mentor = mockRikishi("mentor1", { rank: "ozeki", technique: 70, heyaId: "heya1" });
    const apprentice = mockRikishi("app1", { rank: "juryo", technique: 68, heyaId: "heya1" });
    const bonus = MentorshipService.calculateTechniqueBleed(mentor, apprentice);
    expect(bonus).toBe(0);
  });

  /**
   * Test: Returns 0 adaptability penalty when gap is below threshold.
   * Validates that penalty only applies when technique gap is significant.
   */
  it("returns 0 adaptability penalty when gap is below threshold", () => {
    const mentor = mockRikishi("mentor1", { rank: "ozeki", technique: 70, heyaId: "heya1" });
    const apprentice = mockRikishi("app1", { rank: "juryo", technique: 68, heyaId: "heya1" });
    const penalty = MentorshipService.calculateAdaptabilityPenalty(mentor, apprentice);
    expect(penalty).toBe(0);
  });

  /**
   * Test: Returns -1 adaptability penalty when gap is above threshold.
   * Validates the fixed penalty for significant technique gaps.
   */
  it("returns -1 adaptability penalty when gap is above threshold", () => {
    const mentor = mockRikishi("mentor1", { rank: "ozeki", technique: 90, heyaId: "heya1" });
    const apprentice = mockRikishi("app1", { rank: "jonokuchi", technique: 40, heyaId: "heya1" });
    const penalty = MentorshipService.calculateAdaptabilityPenalty(mentor, apprentice);
    expect(penalty).toBe(-1);
  });

  /**
   * Test: Returns 0 adaptability penalty for ineligible mentorship.
   * Validates that penalty calculation respects eligibility rules.
   */
  it("returns 0 adaptability penalty for ineligible mentorship", () => {
    const mentor = mockRikishi("mentor1", { rank: "makushita", heyaId: "heya1" });
    const apprentice = mockRikishi("app1", { rank: "jonokuchi", heyaId: "heya1" });
    const penalty = MentorshipService.calculateAdaptabilityPenalty(mentor, apprentice);
    expect(penalty).toBe(0);
  });
});
