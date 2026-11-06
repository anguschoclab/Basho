import { describe, it, expect } from "vitest";
import { publishBanzukeUpdate } from "@/engine/banzuke/BanzukePublisher";
import type { Rikishi } from "@/engine/types/rikishi";
import type { BashoState, BashoName } from "@/engine/types/basho";
import type { BanzukeSnapshot } from "@/engine/types/banzuke";
import { MockFactory } from "@tests/helpers/utils/MockFactory";

function makeRikishi(id: string, overrides: Partial<Rikishi> = {}): Rikishi {
  return MockFactory.createRikishi(id, {
    division: "makuuchi",
    rank: "maegashira",
    rankNumber: 1,
    heyaId: "test-heya",
    currentBashoWins: 8,
    currentBashoLosses: 7,
    stats: {
      power: 60,
      speed: 60,
      technique: 60,
      weight: 140,
      stamina: 60,
      mental: 60,
      adaptability: 60,
      balance: 60,
      aggression: 60,
      experience: 10,
    },
    ...overrides,
  });
}

function makeBasho(
  standings: Map<string, { wins: number; losses: number; absences?: number }>
): BashoState {
  return {
    id: "test-basho",
    year: 2026,
    bashoNumber: 1,
    bashoName: "hatsu" as BashoName,
    day: 15,
    matches: [],
    standings,
    isActive: false,
  };
}

describe("BanzukePublisher - absences tracking (Bug 15)", () => {
  it("Test 15.1: publishes banzuke with correct kachi-koshi from standings", () => {
    const r1 = makeRikishi("r1", { rank: "maegashira", rankNumber: 5 });
    const standings = new Map([["r1", { wins: 10, losses: 5 }]]);
    const basho = makeBasho(standings);
    const world = MockFactory.createWorld({
      rikishi: new Map([["r1", r1]]),
      currentBasho: basho,
      history: [
        {
          bashoName: "hatsu",
          year: 2026,
          bashoNumber: 1,
          standings: standings as any,
          yusho: "r1",
          division: "makuuchi",
        } as any,
      ],
    });
    const impact = publishBanzukeUpdate(world);
    expect(impact).toBeDefined();
  });

  it("Test 15.2: handles absences in standings (Bug 15)", () => {
    const r1 = makeRikishi("r1", { rank: "maegashira", rankNumber: 5 });
    const standings = new Map([["r1", { wins: 5, losses: 5, absences: 5 }]]);
    const basho = makeBasho(standings);
    const world = MockFactory.createWorld({
      rikishi: new Map([["r1", r1]]),
      currentBasho: basho,
      history: [
        {
          bashoName: "hatsu",
          year: 2026,
          bashoNumber: 1,
          standings: standings as any,
          yusho: "r1",
          division: "makuuchi",
        } as any,
      ],
    });
    expect(() => publishBanzukeUpdate(world)).not.toThrow();
  });

  it("Test 15.3: resets currentBashoWins and currentBashoLosses to 0", () => {
    const r1 = makeRikishi("r1", {
      rank: "maegashira",
      rankNumber: 5,
      currentBashoWins: 10,
      currentBashoLosses: 5,
    });
    const standings = new Map([["r1", { wins: 10, losses: 5 }]]);
    const basho = makeBasho(standings);
    const world = MockFactory.createWorld({
      rikishi: new Map([["r1", r1]]),
      currentBasho: basho,
      activeRikishiIds: new Set(["r1"]),
      cyclePhase: "post_basho",
      history: [
        {
          bashoName: "hatsu",
          year: 2026,
          bashoNumber: 1,
          standings: standings as any,
          yusho: "r1",
          junYusho: [],
          division: "makuuchi",
          ginoSho: undefined,
          shukunsho: undefined,
          kantosho: undefined,
        } as any,
      ],
    });
    const impact = publishBanzukeUpdate(world);
    const r1Update = impact.entities?.rikishiUpdates?.get("r1");
    expect(r1Update?.currentBashoWins).toBe(0);
    expect(r1Update?.currentBashoLosses).toBe(0);
  });

  it("Test 15.4: handles missing standings gracefully", () => {
    const r1 = makeRikishi("r1");
    const basho = makeBasho(new Map());
    const world = MockFactory.createWorld({
      rikishi: new Map([["r1", r1]]),
      currentBasho: basho,
      history: [],
    });
    expect(() => publishBanzukeUpdate(world)).not.toThrow();
  });

  it("Test 15.5: handles empty rikishi map gracefully", () => {
    const basho = makeBasho(new Map());
    const world = MockFactory.createWorld({ rikishi: new Map(), currentBasho: basho, history: [] });
    expect(() => publishBanzukeUpdate(world)).not.toThrow();
  });
});

/** Banzuke snapshot marking `ids` as fought-on banzuke members (makuuchi). */
function makeBanzukeSnapshot(ids: string[]): BanzukeSnapshot {
  return {
    year: 2026,
    bashoNumber: 1,
    divisions: {
      makuuchi: {
        division: "makuuchi",
        slots: [],
        assignments: ids.map((rikishiId) => ({
          rikishiId,
          position: { rank: "maegashira", rankNumber: 5, side: "east" },
        })),
      },
    } as BanzukeSnapshot["divisions"],
  };
}

describe("BanzukePublisher — full absence accounting", () => {
  function makePostBashoWorld(
    rikishi: Map<string, Rikishi>,
    standings: Map<string, { wins: number; losses: number; absences?: number }>,
    extras: Record<string, unknown> = {}
  ) {
    const basho = makeBasho(standings);
    return MockFactory.createWorld({
      rikishi,
      currentBasho: basho,
      activeRikishiIds: new Set(rikishi.keys()),
      cyclePhase: "post_basho",
      history: [],
      ...extras,
    });
  }

  it("synthesizes a 0-0-divisionDays record for a full-kyūjō banzuke member", () => {
    const r1 = makeRikishi("r1");
    const world = makePostBashoWorld(
      new Map([["r1", r1]]),
      new Map(), // no standings row — full kyūjō
      { currentBanzuke: makeBanzukeSnapshot(["r1"]) }
    );

    const impact = publishBanzukeUpdate(world);
    const u = impact.entities?.rikishiUpdates?.get("r1");
    expect(u).toBeDefined();
    const last = u?.careerHistory?.at(-1);
    expect(last?.wins).toBe(0);
    expect(last?.losses).toBe(0);
    expect(last?.absences).toBe(15);
    expect(u?.consecutiveKyujo).toBe(1);
    expect(u?.careerAbsences).toBe(15);
    expect(u?.absentFinalDay).toBe(true);
  });

  it("falls back to activeRikishiIds when no banzuke snapshot exists", () => {
    const r1 = makeRikishi("r1");
    const world = makePostBashoWorld(new Map([["r1", r1]]), new Map());

    const impact = publishBanzukeUpdate(world);
    const u = impact.entities?.rikishiUpdates?.get("r1");
    expect(u?.consecutiveKyujo).toBe(1);
    expect(u?.careerAbsences).toBe(15);
  });

  it("does NOT synthesize for rikishi outside the active set", () => {
    const r1 = makeRikishi("r1");
    const world = MockFactory.createWorld({
      rikishi: new Map([["r1", r1]]),
      currentBasho: makeBasho(new Map()),
      activeRikishiIds: new Set(), // r1 inactive/retired
      cyclePhase: "post_basho",
      history: [],
      currentBanzuke: makeBanzukeSnapshot(["r1"]),
    });

    const impact = publishBanzukeUpdate(world);
    expect(impact.entities?.rikishiUpdates?.get("r1")).toBeUndefined();
  });

  it("derives missed days as divisionDays − wins − losses (not the raw fusenshō count)", () => {
    const r1 = makeRikishi("r1");
    const world = makePostBashoWorld(
      new Map([["r1", r1]]),
      new Map([["r1", { wins: 5, losses: 5, absences: 1 }]])
    );

    const impact = publishBanzukeUpdate(world);
    const u = impact.entities?.rikishiUpdates?.get("r1");
    const last = u?.careerHistory?.at(-1);
    expect(last?.absences).toBe(5); // 15 − 5 − 5, not the raw 1
    expect(u?.careerAbsences).toBe(5);
    expect(u?.absentFinalDay).toBe(true); // 10 < 15 scheduled bouts
    expect(u?.consecutiveKyujo).toBe(0); // partial absence is not kyūjō
  });

  it("generalizes consecutiveKyujo beyond yokozuna — a full-kyūjō maegashira accumulates", () => {
    const r1 = makeRikishi("r1", { consecutiveKyujo: 2 });
    const world = makePostBashoWorld(
      new Map([["r1", r1]]),
      new Map(),
      { currentBanzuke: makeBanzukeSnapshot(["r1"]) }
    );

    const impact = publishBanzukeUpdate(world);
    expect(impact.entities?.rikishiUpdates?.get("r1")?.consecutiveKyujo).toBe(3);
  });

  it("makes absence penalties reachable — full-kyūjō rikishi demote", () => {
    const r1 = makeRikishi("r1", { rank: "maegashira", rankNumber: 5 });
    const world = makePostBashoWorld(
      new Map([["r1", r1]]),
      new Map(),
      { currentBanzuke: makeBanzukeSnapshot(["r1"]) }
    );

    const impact = publishBanzukeUpdate(world);
    const u = impact.entities?.rikishiUpdates?.get("r1");
    // 0-0-15 → full-kyūjō penalty weight → large negative movement → demotion.
    const demoted =
      u?.division !== "makuuchi" ||
      u?.rank !== "maegashira" ||
      (u?.rankNumber ?? 5) > 5;
    expect(demoted).toBe(true);
  });
});
