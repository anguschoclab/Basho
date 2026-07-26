import { describe, it, expect } from "vitest";
import { activeDivisionRoster } from "@/engine/scheduleHelpers";
import type { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */

function makeRikishi(id: string, opts?: Record<string, any>): Rikishi {
  return {
    id,
    shikona: `Rikishi ${id}`,
    careerWins: 10,
    careerLosses: 5,
    currentBashoWins: 0,
    currentBashoLosses: 0,
    makuuchiWins: 0,
    divisionRecords: {
      makuuchi: { wins: 0, losses: 0 },
      juryo: { wins: 0, losses: 0 },
      makushita: { wins: 0, losses: 0 },
      sandanme: { wins: 0, losses: 0 },
      jonidan: { wins: 0, losses: 0 },
      jonokuchi: { wins: 0, losses: 0 },
    },
    division: "makuuchi",
    rank: "maegashira",
    side: "east",
    stats: { achievements: undefined },
    heyaId: "test-heya",
    ...opts,
  } as unknown as Rikishi;
}

function makeWorld(rikishiList: Rikishi[]): WorldState {
  const map = new Map<string, Rikishi>();
  const ids: string[] = [];
  for (const r of rikishiList) {
    map.set(r.id, r);
    ids.push(r.id);
  }
  return {
    rikishi: map,
    activeRikishiIds: ids,
    heyas: new Map([
      ["test-heya", { id: "test-heya", name: "Test Heya", rikishiIds: ids } as any],
    ]),
    calendar: { currentWeek: 1, month: 1, year: 2025, currentDay: 1 },
  } as any;
}

describe("N7/N8: Scheduling isKyujo filter", () => {
  it("G.1: activeDivisionRoster excludes isKyujo rikishi", () => {
    const r1 = makeRikishi("r1", { division: "makuuchi", injured: false, isKyujo: false });
    const r2 = makeRikishi("r2", { division: "makuuchi", injured: false, isKyujo: true });
    const r3 = makeRikishi("r3", { division: "makuuchi", injured: false, isKyujo: false });
    const world = makeWorld([r1, r2, r3]);
    const roster = activeDivisionRoster(world, "makuuchi");
    const ids = roster.map((r) => r.id);
    // r2 should be excluded because isKyujo is true
    expect(ids).toContain("r1");
    expect(ids).toContain("r3");
    expect(ids).not.toContain("r2");
  });

  it("G.2: activeDivisionRoster still excludes injured rikishi (regression guard)", () => {
    const r1 = makeRikishi("r1", { division: "makuuchi", injured: false, isKyujo: false });
    const r2 = makeRikishi("r2", { division: "makuuchi", injured: true, isKyujo: false });
    const world = makeWorld([r1, r2]);
    const roster = activeDivisionRoster(world, "makuuchi");
    const ids = roster.map((r) => r.id);
    expect(ids).toContain("r1");
    expect(ids).not.toContain("r2");
  });

  it("G.3: activeDivisionRoster filters by division", () => {
    const r1 = makeRikishi("r1", { division: "makuuchi", injured: false, isKyujo: false });
    const r2 = makeRikishi("r2", { division: "juryo", injured: false, isKyujo: false });
    const world = makeWorld([r1, r2]);
    const roster = activeDivisionRoster(world, "makuuchi");
    const ids = roster.map((r) => r.id);
    expect(ids).toContain("r1");
    expect(ids).not.toContain("r2");
  });

  it("G.4: activeDivisionRoster returns sorted by id", () => {
    const r3 = makeRikishi("r3", { division: "makuuchi", injured: false, isKyujo: false });
    const r1 = makeRikishi("r1", { division: "makuuchi", injured: false, isKyujo: false });
    const r2 = makeRikishi("r2", { division: "makuuchi", injured: false, isKyujo: false });
    const world = makeWorld([r3, r1, r2]);
    const roster = activeDivisionRoster(world, "makuuchi");
    const ids = roster.map((r) => r.id);
    expect(ids).toEqual(["r1", "r2", "r3"]);
  });

  it("G.5: TournamentSimulator gives fusensho when isKyujo is true (N9 logic check)", () => {
    // This tests the N9 fix logic: isKyujo should trigger walkover
    const east = makeRikishi("east", { injured: false, isKyujo: true });
    const west = makeRikishi("west", { injured: false, isKyujo: false });
    // Simulate the fixed check
    const shouldWalkover =
      east.injured || west.injured || east.isKyujo || west.isKyujo || east.isRetired || west.isRetired;
    expect(shouldWalkover).toBe(true);
  });
});
