import { describe, it, expect } from "vitest";
import {
  MentorshipService,
  checkMentorMenteeBout,
} from "@/engine/systems/training/MentorshipService";
import { mockRikishi } from "../../utils";

describe("MentorshipService.canMentor", () => {
  it("returns true for a sekitori mentor and non-sekitori apprentice in the same heya", () => {
    const mentor = mockRikishi("mentor", { rank: "maegashira", heyaId: "h1" });
    const apprentice = mockRikishi("apprentice", { rank: "makushita", heyaId: "h1" });
    expect(MentorshipService.canMentor(mentor, apprentice)).toBe(true);
  });

  it("returns false for cross-heya pairs", () => {
    const mentor = mockRikishi("mentor", { rank: "maegashira", heyaId: "h1" });
    const apprentice = mockRikishi("apprentice", { rank: "makushita", heyaId: "h2" });
    expect(MentorshipService.canMentor(mentor, apprentice)).toBe(false);
  });

  it("returns false when the mentor is not sekitori", () => {
    const mentor = mockRikishi("mentor", { rank: "makushita", heyaId: "h1" });
    const apprentice = mockRikishi("apprentice", { rank: "jonidan", heyaId: "h1" });
    expect(MentorshipService.canMentor(mentor, apprentice)).toBe(false);
  });

  it("returns false when the apprentice is sekitori", () => {
    const mentor = mockRikishi("mentor", { rank: "ozeki", heyaId: "h1" });
    const apprentice = mockRikishi("apprentice", { rank: "juryo", heyaId: "h1" });
    expect(MentorshipService.canMentor(mentor, apprentice)).toBe(false);
  });

  it("returns false when mentor and apprentice are the same rikishi", () => {
    const rikishi = mockRikishi("r1", { rank: "maegashira", heyaId: "h1" });
    expect(MentorshipService.canMentor(rikishi, rikishi)).toBe(false);
  });

  it("returns false when the mentor is injured", () => {
    const mentor = mockRikishi("mentor", { rank: "maegashira", heyaId: "h1", injured: true });
    const apprentice = mockRikishi("apprentice", { rank: "makushita", heyaId: "h1" });
    expect(MentorshipService.canMentor(mentor, apprentice)).toBe(false);
  });

  it("returns false when the mentor is retired", () => {
    const mentor = mockRikishi("mentor", { rank: "maegashira", heyaId: "h1", isRetired: true });
    const apprentice = mockRikishi("apprentice", { rank: "makushita", heyaId: "h1" });
    expect(MentorshipService.canMentor(mentor, apprentice)).toBe(false);
  });

  it("returns false when the apprentice is retired", () => {
    const mentor = mockRikishi("mentor", { rank: "maegashira", heyaId: "h1" });
    const apprentice = mockRikishi("apprentice", {
      rank: "makushita",
      heyaId: "h1",
      isRetired: true,
    });
    expect(MentorshipService.canMentor(mentor, apprentice)).toBe(false);
  });
});

describe("MentorshipService.calculateTechniqueBleed", () => {
  it("returns 0 when the technique gap is below the bleed threshold", () => {
    const mentor = mockRikishi("mentor", { technique: 50 });
    const apprentice = mockRikishi("apprentice", { technique: 45 });
    expect(MentorshipService.calculateTechniqueBleed(mentor, apprentice)).toBe(0);
  });

  it("returns floor(gap * BLEED_SCALE) for moderate gaps", () => {
    const mentor = mockRikishi("mentor", { technique: 70 });
    const apprentice = mockRikishi("apprentice", { technique: 50 });
    // gap = 20, 20 * 0.06 = 1.2 -> floor = 1
    expect(MentorshipService.calculateTechniqueBleed(mentor, apprentice)).toBe(1);
  });

  it("caps bleed at MENTORSHIP_MAX_BLEED", () => {
    const mentor = mockRikishi("mentor", { technique: 100 });
    const apprentice = mockRikishi("apprentice", { technique: 0 });
    // gap = 100, 100 * 0.06 = 6 -> cap at 3
    expect(MentorshipService.calculateTechniqueBleed(mentor, apprentice)).toBe(3);
  });
});

describe("MentorshipService.calculateAdaptabilityPenalty", () => {
  it("returns 0 for an ineligible pair", () => {
    const mentor = mockRikishi("mentor", { rank: "maegashira", heyaId: "h1" });
    const apprentice = mockRikishi("apprentice", { rank: "makushita", heyaId: "h2" });
    expect(MentorshipService.calculateAdaptabilityPenalty(mentor, apprentice)).toBe(0);
  });

  it("returns 0 when the technique gap is below the threshold", () => {
    const mentor = mockRikishi("mentor", { technique: 55 });
    const apprentice = mockRikishi("apprentice", { technique: 50 });
    expect(MentorshipService.calculateAdaptabilityPenalty(mentor, apprentice)).toBe(0);
  });

  it("returns -1 when the pair is eligible and the gap is large enough", () => {
    const mentor = mockRikishi("mentor", { rank: "maegashira", heyaId: "h1", technique: 70 });
    const apprentice = mockRikishi("apprentice", {
      rank: "makushita",
      heyaId: "h1",
      technique: 50,
    });
    expect(MentorshipService.calculateAdaptabilityPenalty(mentor, apprentice)).toBe(-1);
  });
});

describe("checkMentorMenteeBout", () => {
  it("returns an event when a mentors b", () => {
    const mentor = mockRikishi("mentor");
    mentor.menteeIds = ["apprentice"];
    const apprentice = mockRikishi("apprentice");
    apprentice.mentorId = "mentor";

    const event = checkMentorMenteeBout(mentor, apprentice);
    expect(event).toEqual({
      type: "mentor_mentee_bout",
      mentorId: "mentor",
      apprenticeId: "apprentice",
    });
  });

  it("returns an event when b mentors a", () => {
    const mentor = mockRikishi("mentor");
    mentor.menteeIds = ["apprentice"];
    const apprentice = mockRikishi("apprentice");
    apprentice.mentorId = "mentor";

    const event = checkMentorMenteeBout(apprentice, mentor);
    expect(event).toEqual({
      type: "mentor_mentee_bout",
      mentorId: "mentor",
      apprenticeId: "apprentice",
    });
  });

  it("returns null for unrelated rikishi", () => {
    const a = mockRikishi("a");
    const b = mockRikishi("b");
    expect(checkMentorMenteeBout(a, b)).toBeNull();
  });

  it("returns null when a and b are the same rikishi", () => {
    const rikishi = mockRikishi("r1");
    rikishi.mentorId = "r1";
    rikishi.menteeIds = ["r1"];
    expect(checkMentorMenteeBout(rikishi, rikishi)).toBeNull();
  });
});
