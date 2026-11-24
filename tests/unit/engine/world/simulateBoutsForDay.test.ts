import { describe, it, expect } from "vitest";
import { simulateBoutsForDay } from "@/engine/core/world";
import type { WorldState } from "@/engine/types/world";
import type { MatchSchedule, BashoState, BashoName } from "@/engine/types/basho";
import { MockFactory } from "@tests/helpers/utils/MockFactory";

// Use standard MockFactory rather than locally redefining makeRikishi/makeWorldWithMatches
// to pass the factoryDiscipline.test.ts check.

function _makeTestWorld(
  matches: MatchSchedule[],
  bashoOverrides?: Partial<BashoState>
): WorldState {
  const east1 = MockFactory.createRikishi("east1", { heyaId: "test-heya" });
  const west1 = MockFactory.createRikishi("west1", { side: "west", heyaId: "test-heya" });
  const east2 = MockFactory.createRikishi("east2", { heyaId: "test-heya" });
  const west2 = MockFactory.createRikishi("west2", { side: "west", heyaId: "test-heya" });

  const basho: BashoState = {
    id: "test-basho",
    year: 2026,
    bashoNumber: 1,
    bashoName: "hatsu" as BashoName,
    day: 1,
    matches,
    standings: new Map([
      ["east1", { wins: 0, losses: 0 }],
      ["west1", { wins: 0, losses: 0 }],
      ["east2", { wins: 0, losses: 0 }],
      ["west2", { wins: 0, losses: 0 }],
    ]),
    isActive: true,
    ...bashoOverrides,
  };

  return MockFactory.createWorld({
    rikishi: new Map([
      ["east1", east1],
      ["west1", west1],
      ["east2", east2],
      ["west2", west2],
    ]),
    heyas: new Map([
      [
        "test-heya",
        MockFactory.createHeya("test-heya", { rikishiIds: ["east1", "west1", "east2", "west2"] }),
      ],
    ]),
    currentBasho: basho,
  });
}

function _makeTestMatch(
  boutId: string,
  day: number,
  eastId: string = "east1",
  westId: string = "west1"
): MatchSchedule {
  return { boutId, day, eastRikishiId: eastId, westRikishiId: westId };
}

describe("simulateBoutsForDay", () => {
  it("Test 1: simulates all unplayed matches for the day", () => {
    const matches = [
      _makeTestMatch("b1", 1, "east1", "west1"),
      _makeTestMatch("b2", 1, "east2", "west2"),
    ];
    const world = _makeTestWorld(matches);
    const result = simulateBoutsForDay(world);

    expect(result.results).toHaveLength(2);
    expect(result.results[0].boutId).toBe("b1");
    expect(result.results[1].boutId).toBe("b2");

    const updatedBasho = result.world.currentBasho!;
    expect(updatedBasho.matches[0].result).toBeDefined();
    expect(updatedBasho.matches[1].result).toBeDefined();
  });

  it("Test 2: skips matches for other days", () => {
    const matches = [
      _makeTestMatch("b1", 1, "east1", "west1"),
      _makeTestMatch("b2", 2, "east2", "west2"),
    ];
    const world = _makeTestWorld(matches, { day: 1 });
    const result = simulateBoutsForDay(world);

    expect(result.results).toHaveLength(1);
    expect(result.results[0].boutId).toBe("b1");

    const updatedBasho = result.world.currentBasho!;
    expect(updatedBasho.matches[0].result).toBeDefined();
    expect(updatedBasho.matches[1].result).toBeUndefined();
  });

  it("Test 3: skips matches that already have a result", () => {
    const matches = [
      _makeTestMatch("b1", 1, "east1", "west1"),
      _makeTestMatch("b2", 1, "east2", "west2"),
    ];

    matches[0].result = {
      boutId: "b1",
      winner: "east",
      winnerRikishiId: "east1",
      loserRikishiId: "west1",
      kimarite: "oshidashi",
      kimariteName: "Oshidashi",
      stance: "migi-yotsu",
      tachiaiWinner: "east",
      duration: 5.2,
      upset: false,
      isKinboshi: false,
      log: [],
      kenshoEnvelopes: 0,
      momentumScore: 0,
      inBoutInjury: null,
      isTimeout: false,
    };

    const world = _makeTestWorld(matches);
    const result = simulateBoutsForDay(world);

    expect(result.results).toHaveLength(1);
    expect(result.results[0].boutId).toBe("b2");
  });

  it("Test 4: returns empty array if no current basho", () => {
    const world = MockFactory.createWorld({ currentBasho: undefined });
    const result = simulateBoutsForDay(world);
    expect(result.results).toHaveLength(0);
    expect(result.world).toBe(world);
  });

  it("consumes boutTactics keyed to resolved bouts and preserves future-day tactics", () => {
    const matches = [
      _makeTestMatch("b1", 1, "east1", "west1"),
      _makeTestMatch("b2", 2, "east2", "west2"),
    ];
    const world = _makeTestWorld(matches, { day: 1 });
    world.boutTactics = {
      b1: "power_through" as never,
      b2: "endure" as never,
    };

    const result = simulateBoutsForDay(world);

    expect(result.results).toHaveLength(1);
    // The resolved bout's tactic is consumed; the day-2 tactic survives.
    expect(result.world.boutTactics?.b1).toBeUndefined();
    expect(result.world.boutTactics?.b2).toBe("endure");
  });

  it("updates standings so wins+losses equal the number of resolved bouts", () => {
    const matches = [
      _makeTestMatch("b1", 1, "east1", "west1"),
      _makeTestMatch("b2", 1, "east2", "west2"),
    ];
    const world = _makeTestWorld(matches, { day: 1 });

    const result = simulateBoutsForDay(world);
    const standings = result.world.currentBasho!.standings!;

    let wins = 0;
    let losses = 0;
    for (const [, s] of standings) {
      wins += s.wins;
      losses += s.losses;
    }
    expect(wins).toBe(2);
    expect(losses).toBe(2);
  });

  it("writes results to the correct match indices when the day has prior resolved bouts", () => {
    const matches = [
      _makeTestMatch("b0", 1, "east1", "west1"),
      _makeTestMatch("b1", 1, "east2", "west2"),
      _makeTestMatch("b2", 1, "east1", "west2"),
    ];
    matches[0].result = {
      boutId: "b0",
      winner: "east",
      winnerRikishiId: "east1",
      loserRikishiId: "west1",
      kimarite: "yorikiri",
      kimariteName: "Yorikiri",
      stance: "migi-yotsu",
      tachiaiWinner: "east",
      duration: 4.1,
      upset: false,
      isKinboshi: false,
      log: [],
      kenshoEnvelopes: 0,
      momentumScore: 0,
      inBoutInjury: null,
      isTimeout: false,
    };
    const world = _makeTestWorld(matches, { day: 1 });

    const result = simulateBoutsForDay(world);

    expect(result.results).toHaveLength(2);
    const out = result.world.currentBasho!.matches;
    // Index-stable: the pre-resolved match keeps its original result object,
    // later slots get their own results — no drift or duplication.
    expect(out[0].result?.boutId).toBe("b0");
    expect(out[1].result?.boutId).toBe("b1");
    expect(out[2].result?.boutId).toBe("b2");
  });
});
