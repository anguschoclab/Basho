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
});
