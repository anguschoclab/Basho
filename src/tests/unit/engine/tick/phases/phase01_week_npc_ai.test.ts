import { describe, it, expect } from "vitest";
import { phase01_week_npc_ai } from "@/engine/tick/phases/phase01_week_npc_ai";
import { mockRikishi, makeMockWorld } from "../../utils";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";

describe("phase01_week_npc_ai mentorship", () => {
  it("assigns mentors to eligible NPC apprentices using lineage.assignMentor", () => {
    const mentor = mockRikishi("mentor", {
      rank: "maegashira",
      division: "makuuchi",
      heyaId: "h1",
      technique: 80,
    });
    const apprentice = mockRikishi("apprentice", {
      rank: "makushita",
      division: "makushita",
      heyaId: "h1",
      technique: 40,
    });
    const oyakata = MockFactory.createOyakata("o1", { heyaId: "h1" });
    const heya = MockFactory.createHeya("h1", {
      rikishiIds: ["mentor", "apprentice"],
      oyakataId: "o1",
    });

    const world = makeMockWorld({
      rikishi: new Map([
        ["mentor", mentor],
        ["apprentice", apprentice],
      ]),
      heyas: new Map([["h1", heya]]),
      oyakata: new Map([["o1", oyakata]]),
      playerHeyaId: "player",
      lineage: [],
      rivalriesState: { pairs: {}, version: "1.0.0" } as any,
    });

    const impact = phase01_week_npc_ai(world);

    const updates = impact.entities?.rikishiUpdates;
    expect(updates?.get("apprentice")?.mentorId).toBe("mentor");
    expect(updates?.get("mentor")?.menteeIds).toContain("apprentice");
    expect(impact.worldFields?.lineage?.length ?? 0).toBeGreaterThan(0);
  });

  it("does not assign mentors to player heya", () => {
    const apprentice = mockRikishi("apprentice", {
      rank: "makushita",
      division: "makushita",
      heyaId: "h1",
      technique: 40,
    });
    const mentor = mockRikishi("mentor", {
      rank: "maegashira",
      division: "makuuchi",
      heyaId: "h1",
      technique: 80,
    });
    const oyakata = MockFactory.createOyakata("o1", { heyaId: "h1" });
    const heya = MockFactory.createHeya("h1", {
      rikishiIds: ["mentor", "apprentice"],
      oyakataId: "o1",
    });

    const world = makeMockWorld({
      rikishi: new Map([
        ["mentor", mentor],
        ["apprentice", apprentice],
      ]),
      heyas: new Map([["h1", heya]]),
      oyakata: new Map([["o1", oyakata]]),
      playerHeyaId: "h1",
      lineage: [],
      rivalriesState: { pairs: {}, version: "1.0.0" } as any,
    });

    const impact = phase01_week_npc_ai(world);
    expect(impact.entities?.rikishiUpdates?.has("apprentice") ?? false).toBe(false);
  });

  it("excludes retired rikishi from active and apprentices", () => {
    const retired = mockRikishi("retired", {
      rank: "maegashira",
      division: "makuuchi",
      heyaId: "h1",
      technique: 80,
      isRetired: true,
    });
    const apprentice = mockRikishi("apprentice", {
      rank: "makushita",
      division: "makushita",
      heyaId: "h1",
      technique: 40,
    });
    const oyakata = MockFactory.createOyakata("o1", { heyaId: "h1" });
    const heya = MockFactory.createHeya("h1", {
      rikishiIds: ["retired", "apprentice"],
      oyakataId: "o1",
    });

    const world = makeMockWorld({
      rikishi: new Map([
        ["retired", retired],
        ["apprentice", apprentice],
      ]),
      heyas: new Map([["h1", heya]]),
      oyakata: new Map([["o1", oyakata]]),
      playerHeyaId: "player",
      lineage: [],
      rivalriesState: { pairs: {}, version: "1.0.0" } as any,
    });

    const impact = phase01_week_npc_ai(world);

    // Retired rikishi should not be assigned as mentor
    expect(impact.entities?.rikishiUpdates?.get("apprentice")?.mentorId).not.toBe("retired");
    // Apprentice should not get a mentor since no eligible active mentor exists
    expect(impact.entities?.rikishiUpdates?.has("apprentice") ?? false).toBe(false);
  });

  it("excludes injured rikishi from active and apprentices", () => {
    const injured = mockRikishi("injured", {
      rank: "maegashira",
      division: "makuuchi",
      heyaId: "h1",
      technique: 80,
      injured: true,
    });
    const apprentice = mockRikishi("apprentice", {
      rank: "makushita",
      division: "makushita",
      heyaId: "h1",
      technique: 40,
    });
    const oyakata = MockFactory.createOyakata("o1", { heyaId: "h1" });
    const heya = MockFactory.createHeya("h1", {
      rikishiIds: ["injured", "apprentice"],
      oyakataId: "o1",
    });

    const world = makeMockWorld({
      rikishi: new Map([
        ["injured", injured],
        ["apprentice", apprentice],
      ]),
      heyas: new Map([["h1", heya]]),
      oyakata: new Map([["o1", oyakata]]),
      playerHeyaId: "player",
      lineage: [],
      rivalriesState: { pairs: {}, version: "1.0.0" } as any,
    });

    const impact = phase01_week_npc_ai(world);

    // Injured rikishi should not be assigned as mentor
    expect(impact.entities?.rikishiUpdates?.get("apprentice")?.mentorId).not.toBe("injured");
    expect(impact.entities?.rikishiUpdates?.has("apprentice") ?? false).toBe(false);
  });

  it("sekitori without mentor is active but not apprentice", () => {
    const sekitori = mockRikishi("sekitori", {
      rank: "maegashira",
      division: "makuuchi",
      heyaId: "h1",
      technique: 80,
    });
    const apprentice = mockRikishi("apprentice", {
      rank: "makushita",
      division: "makushita",
      heyaId: "h1",
      technique: 40,
    });
    const oyakata = MockFactory.createOyakata("o1", { heyaId: "h1" });
    const heya = MockFactory.createHeya("h1", {
      rikishiIds: ["sekitori", "apprentice"],
      oyakataId: "o1",
    });

    const world = makeMockWorld({
      rikishi: new Map([
        ["sekitori", sekitori],
        ["apprentice", apprentice],
      ]),
      heyas: new Map([["h1", heya]]),
      oyakata: new Map([["o1", oyakata]]),
      playerHeyaId: "player",
      lineage: [],
      rivalriesState: { pairs: {}, version: "1.0.0" } as any,
    });

    const impact = phase01_week_npc_ai(world);

    // Sekitori should be assigned as mentor to apprentice
    expect(impact.entities?.rikishiUpdates?.get("apprentice")?.mentorId).toBe("sekitori");
    // Sekitori itself should not get a mentor (it's not an apprentice)
    expect(impact.entities?.rikishiUpdates?.get("sekitori")?.mentorId).toBeUndefined();
  });

  it("non-sekitori with mentor is active but not apprentice", () => {
    const mentor = mockRikishi("mentor", {
      rank: "maegashira",
      division: "makuuchi",
      heyaId: "h1",
      technique: 80,
    });
    const withMentor = mockRikishi("withMentor", {
      rank: "makushita",
      division: "makushita",
      heyaId: "h1",
      technique: 40,
      mentorId: "mentor",
    });
    const oyakata = MockFactory.createOyakata("o1", { heyaId: "h1" });
    const heya = MockFactory.createHeya("h1", {
      rikishiIds: ["mentor", "withMentor"],
      oyakataId: "o1",
    });

    const world = makeMockWorld({
      rikishi: new Map([
        ["mentor", mentor],
        ["withMentor", withMentor],
      ]),
      heyas: new Map([["h1", heya]]),
      oyakata: new Map([["o1", oyakata]]),
      playerHeyaId: "player",
      lineage: [],
      rivalriesState: { pairs: {}, version: "1.0.0" } as any,
    });

    const impact = phase01_week_npc_ai(world);

    // withMentor already has a mentor, should not get reassigned
    expect(impact.entities?.rikishiUpdates?.get("withMentor")?.mentorId).not.toBe("mentor");
  });

  it("non-sekitori without mentor is both active and apprentice", () => {
    const mentor = mockRikishi("mentor", {
      rank: "maegashira",
      division: "makuuchi",
      heyaId: "h1",
      technique: 80,
    });
    const apprentice = mockRikishi("apprentice", {
      rank: "makushita",
      division: "makushita",
      heyaId: "h1",
      technique: 40,
    });
    const oyakata = MockFactory.createOyakata("o1", { heyaId: "h1" });
    const heya = MockFactory.createHeya("h1", {
      rikishiIds: ["mentor", "apprentice"],
      oyakataId: "o1",
    });

    const world = makeMockWorld({
      rikishi: new Map([
        ["mentor", mentor],
        ["apprentice", apprentice],
      ]),
      heyas: new Map([["h1", heya]]),
      oyakata: new Map([["o1", oyakata]]),
      playerHeyaId: "player",
      lineage: [],
      rivalriesState: { pairs: {}, version: "1.0.0" } as any,
    });

    const impact = phase01_week_npc_ai(world);

    // Apprentice should get mentor assigned
    expect(impact.entities?.rikishiUpdates?.get("apprentice")?.mentorId).toBe("mentor");
  });

  it("empty heya does not crash", () => {
    const oyakata = MockFactory.createOyakata("o1", { heyaId: "h1" });
    const heya = MockFactory.createHeya("h1", {
      rikishiIds: [],
      oyakataId: "o1",
    });

    const world = makeMockWorld({
      rikishi: new Map(),
      heyas: new Map([["h1", heya]]),
      oyakata: new Map([["o1", oyakata]]),
      playerHeyaId: "player",
      lineage: [],
      rivalriesState: { pairs: {}, version: "1.0.0" } as any,
    });

    const impact = phase01_week_npc_ai(world);
    expect(impact).toBeDefined();
    expect(impact.entities?.rikishiUpdates?.size ?? 0).toBe(0);
  });
});
