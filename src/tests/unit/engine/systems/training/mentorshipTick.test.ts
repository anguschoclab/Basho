import { describe, it, expect } from "vitest";
import { applyMentorshipBonuses } from "@/engine/systems/training/MentorshipService";
import { MAX_STAT_CEILING } from "@/constants/engine/training";
import { mockRikishi, makeMockWorld, makeMockHeya } from "../../utils";

function makeWorldWithPair(
  mentorOverrides: Partial<ReturnType<typeof mockRikishi>> = {},
  apprenticeOverrides: Partial<ReturnType<typeof mockRikishi>> = {},
  extraRikishi: ReturnType<typeof mockRikishi>[] = []
) {
  const mentor = mockRikishi("mentor", { rank: "maegashira", heyaId: "h1", ...mentorOverrides });
  const apprentice = mockRikishi("apprentice", {
    rank: "makushita",
    heyaId: "h1",
    mentorId: "mentor",
    ...apprenticeOverrides,
  });
  mentor.menteeIds = ["apprentice"];

  const rikishi = new Map([
    [mentor.id, mentor],
    [apprentice.id, apprentice],
    ...extraRikishi.map((r) => [r.id, r] as const),
  ]);
  const heya = makeMockHeya("h1", { rikishiIds: Array.from(rikishi.keys()) });
  return makeMockWorld({ rikishi, heyas: new Map([["h1", heya]]) });
}

describe("applyMentorshipBonuses", () => {
  it("increases apprentice technique when the mentor has a higher technique", () => {
    const world = makeWorldWithPair({ technique: 70 }, { technique: 50 });
    const impact = applyMentorshipBonuses(world);
    const update = impact.entities?.rikishiUpdates?.get("apprentice");
    expect(update).toBeDefined();
    expect((update?.stats as { technique: number }).technique).toBe(51);
  });

  it("decreases apprentice adaptability for an active mentorship", () => {
    const world = makeWorldWithPair({ technique: 70 }, { technique: 50 });
    const impact = applyMentorshipBonuses(world);
    const update = impact.entities?.rikishiUpdates?.get("apprentice");
    expect((update?.stats as { adaptability: number }).adaptability).toBe(49);
  });

  it("skips unmentored rikishi", () => {
    const lone = mockRikishi("lone", { rank: "makushita", heyaId: "h1", technique: 30 });
    const world = makeWorldWithPair({ technique: 80 }, { technique: 50 }, [lone]);
    const impact = applyMentorshipBonuses(world);
    expect(impact.entities?.rikishiUpdates?.has("lone")).toBe(false);
  });

  it("skips apprentices whose mentor is injured", () => {
    const world = makeWorldWithPair({ technique: 70, injured: true }, { technique: 50 });
    const impact = applyMentorshipBonuses(world);
    expect((impact.entities?.rikishiUpdates?.size ?? 0)).toBe(0);
  });

  it("skips apprentices whose mentor is retired", () => {
    const world = makeWorldWithPair({ technique: 70, isRetired: true }, { technique: 50 });
    const impact = applyMentorshipBonuses(world);
    expect((impact.entities?.rikishiUpdates?.size ?? 0)).toBe(0);
  });

  it("skips updates when the technique gap is below the threshold", () => {
    const world = makeWorldWithPair({ technique: 55 }, { technique: 50 });
    const impact = applyMentorshipBonuses(world);
    expect((impact.entities?.rikishiUpdates?.size ?? 0)).toBe(0);
  });

  it("clamps technique at MAX_STAT_CEILING and applies the adaptability penalty", () => {
    const world = makeWorldWithPair({ technique: 90 }, { technique: 98, adaptability: 50 });
    const impact = applyMentorshipBonuses(world);
    const update = impact.entities?.rikishiUpdates?.get("apprentice");
    expect(update).toBeDefined();
    expect((update!.stats as { technique: number }).technique).toBe(MAX_STAT_CEILING);
    expect((update!.stats as { adaptability: number }).adaptability).toBe(49);
  });

  it("handles multiple apprentices of the same mentor", () => {
    const mentor = mockRikishi("mentor", { rank: "maegashira", heyaId: "h1", technique: 70 });
    const apprentice1 = mockRikishi("apprentice1", {
      rank: "makushita",
      heyaId: "h1",
      mentorId: "mentor",
      technique: 50,
    });
    const apprentice2 = mockRikishi("apprentice2", {
      rank: "makushita",
      heyaId: "h1",
      mentorId: "mentor",
      technique: 52,
    });
    mentor.menteeIds = ["apprentice1", "apprentice2"];

    const rikishi = new Map([
      [mentor.id, mentor],
      [apprentice1.id, apprentice1],
      [apprentice2.id, apprentice2],
    ]);
    const heya = makeMockHeya("h1", { rikishiIds: Array.from(rikishi.keys()) });
    const world = makeMockWorld({ rikishi, heyas: new Map([["h1", heya]]) });

    const impact = applyMentorshipBonuses(world);
    expect(impact.entities?.rikishiUpdates?.get("apprentice1")).toBeDefined();
    expect(impact.entities?.rikishiUpdates?.get("apprentice2")).toBeDefined();
  });
});
