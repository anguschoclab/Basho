import { describe, it, expect } from "vitest";
import { selectCohortSummaries } from "@/presenters/projections/historyCohortProjections";
import type { WorldState } from "@/engine/types/world";

function makeWorld(rikishi: any[]): WorldState {
  return {
    seed: "test",
    year: 2026,
    heyas: new Map([["h1", { id: "h1", name: "Test" }]]),
    rikishi: new Map(rikishi.map((r) => [r.id, r])),
    activeRikishiIds: rikishi.map((r) => r.id),
    playerHeyaId: "h1",
  } as any;
}

describe("selectCohortSummaries", () => {
  it("returns empty array when no rikishi have cohort IDs", () => {
    const world = makeWorld([{ id: "r1", shikona: "A", heyaId: "h1", isRetired: false }]);
    expect(selectCohortSummaries(world)).toEqual([]);
  });

  it("groups rikishi by cohort ID", () => {
    const world = makeWorld([
      { id: "r1", shikona: "A", heyaId: "h1", isRetired: false, recruitmentCohortId: "2025-hatsu", rank: "makuuchi", rankNumber: 5 },
      { id: "r2", shikona: "B", heyaId: "h1", isRetired: false, recruitmentCohortId: "2025-hatsu", rank: "juryo", rankNumber: 10 },
      { id: "r3", shikona: "C", heyaId: "h1", isRetired: false, recruitmentCohortId: "2026-hatsu", rank: "jonokuchi", rankNumber: 50 },
    ]);
    const result = selectCohortSummaries(world);
    expect(result).toHaveLength(2);
    const hatsu25 = result.find((c) => c.cohortId === "2025-hatsu");
    expect(hatsu25?.totalMembers).toBe(2);
  });

  it("includes top prospects sorted by rank", () => {
    const world = makeWorld([
      { id: "r1", shikona: "High", heyaId: "h1", isRetired: false, recruitmentCohortId: "c1", rank: "makuuchi", rankNumber: 1 },
      { id: "r2", shikona: "Low", heyaId: "h1", isRetired: false, recruitmentCohortId: "c1", rank: "jonokuchi", rankNumber: 50 },
    ]);
    const result = selectCohortSummaries(world);
    expect(result[0].topProspects[0].shikona).toBe("High");
  });
});
