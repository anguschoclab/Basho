/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { advanceOneDay } from "@/engine/tick/tickDaily";
import { makeMockWorld, makeMockBasho, mockRikishi, makeMockHeya } from "../utils";
import type { WorldState } from "@/engine/types/world";
import type { MatchSchedule, BoutResult } from "@/engine/types/basho";
import type { Rikishi } from "@/engine/types/rikishi";

// Mock the world engine functions used by phase01_basho_bouts
vi.mock("@/engine/world", () => ({
  simulateBoutForToday: vi.fn(),
  advanceBashoDay: vi.fn(),
}));

// Import after mock
import * as worldEngine from "@/engine/world";

/**
 * P1.2: Basho pipeline migration tests.
 * Bout resolution should happen inside advanceOneDay via a pipeline phase,
 * not via bashoSlice mutable calls.
 */

function makeBashoWorld(day = 1, overrides: Partial<WorldState> = {}): WorldState {
  const heya = makeMockHeya("heya-1", { rikishiIds: ["r-east", "r-west"] });
  const east = mockRikishi("r-east", { heyaId: "heya-1", division: "makuuchi", rank: "yokozuna" });
  const west = mockRikishi("r-west", { heyaId: "heya-1", division: "makuuchi", rank: "yokozuna" });

  const matches: MatchSchedule[] = [
    {
      boutId: "d1-b0",
      day,
      eastRikishiId: "r-east",
      westRikishiId: "r-west",
      result: undefined,
    } as MatchSchedule,
  ];

  const basho = makeMockBasho({ day, matches, isActive: true });

  return makeMockWorld({
    cyclePhase: "active_basho",
    currentBasho: basho as any,
    currentBashoName: "hatsu",
    _daysSinceLastWeeklyTick: 0,
    playerHeyaId: "heya-1",
    heyas: new Map([["heya-1", heya]]),
    rikishi: new Map([
      ["r-east", east as unknown as Rikishi],
      ["r-west", west as unknown as Rikishi],
    ]),
    calendar: {
      currentWeek: 1,
      year: 2025,
      month: 1,
      week: 1,
      currentDay: 1,
    } as any,
    ...overrides,
  });
}

const mockBoutResult: BoutResult = {
  boutId: "d1-b0",
  winner: "east" as any,
  winnerRikishiId: "r-east",
  loserRikishiId: "r-west",
  kimarite: "yori-kiri" as any,
  kimariteName: "yori-kiri",
  stance: "migiyotsu" as any,
  tachiaiWinner: "east" as any,
  duration: 10,
  upset: false,
};

describe("P1.2: Basho pipeline — bout resolution in advanceOneDay", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("advanceOneDay during active_basho calls phase01_basho_bouts to simulate bouts", () => {
    const world = makeBashoWorld(1);

    (worldEngine.simulateBoutForToday as any).mockImplementation((w: WorldState) => {
      const basho = w.currentBasho;
      if (!basho) return { world: w };
      return {
        world: {
          ...w,
          currentBasho: {
            ...basho,
            matches: (basho.matches ?? []).map((m) =>
              m.day === basho.day && !m.result ? { ...m, result: mockBoutResult } : m
            ),
            standings: new Map([
              ["r-east", { wins: 1, losses: 0 }],
              ["r-west", { wins: 0, losses: 1 }],
            ]),
          },
        },
        result: mockBoutResult,
      };
    });

    (worldEngine.advanceBashoDay as any).mockImplementation((w: WorldState) => ({
      ...w,
      currentBasho: {
        ...w.currentBasho!,
        day: (w.currentBasho?.day ?? 0) + 1,
        currentDay: (w.currentBasho?.day ?? 0) + 1,
      },
    }));

    const result = advanceOneDay(world);

    expect(worldEngine.simulateBoutForToday).toHaveBeenCalled();
    expect(worldEngine.advanceBashoDay).toHaveBeenCalled();
    expect(result.currentBasho?.day).toBe(2);
  });

  it("advanceOneDay during active_basho advances calendar in lockstep with basho day", () => {
    const world = makeBashoWorld(1);

    (worldEngine.simulateBoutForToday as any).mockImplementation((w: WorldState) => ({
      world: {
        ...w,
        currentBasho: {
          ...w.currentBasho!,
          matches: (w.currentBasho?.matches ?? []).map((m) =>
            m.day === w.currentBasho!.day && !m.result ? { ...m, result: mockBoutResult } : m
          ),
        },
      },
      result: mockBoutResult,
    }));

    (worldEngine.advanceBashoDay as any).mockImplementation((w: WorldState) => ({
      ...w,
      currentBasho: { ...w.currentBasho!, day: 2, currentDay: 2 },
    }));

    const result = advanceOneDay(world);

    expect(result.currentBasho?.day).toBe(2);
    expect(result.dayIndexGlobal).toBe((world.dayIndexGlobal ?? 0) + 1);
  });

  it("advanceOneDay does not mutate the input world (immutability)", () => {
    const world = makeBashoWorld(1);
    const originalDay = world.currentBasho?.day;
    const originalMatches = world.currentBasho?.matches;

    (worldEngine.simulateBoutForToday as any).mockImplementation((w: WorldState) => ({
      world: { ...w, currentBasho: { ...w.currentBasho!, day: 999 } },
      result: mockBoutResult,
    }));
    (worldEngine.advanceBashoDay as any).mockImplementation((w: WorldState) => ({
      ...w,
      currentBasho: { ...w.currentBasho!, day: 2 },
    }));

    advanceOneDay(world);

    expect(world.currentBasho?.day).toBe(originalDay);
    expect(world.currentBasho?.matches).toBe(originalMatches);
  });

  it("advanceOneDay resolves bouts and updates standings", () => {
    const world = makeBashoWorld(1);

    (worldEngine.simulateBoutForToday as any).mockImplementation((w: WorldState) => {
      const basho = w.currentBasho!;
      return {
        world: {
          ...w,
          currentBasho: {
            ...basho,
            matches: (basho.matches ?? []).map((m) =>
              m.day === basho.day && !m.result ? { ...m, result: mockBoutResult } : m
            ),
            standings: new Map([
              ["r-east", { wins: 1, losses: 0 }],
              ["r-west", { wins: 0, losses: 1 }],
            ]),
          },
        },
        result: mockBoutResult,
      };
    });

    (worldEngine.advanceBashoDay as any).mockImplementation((w: WorldState) => ({
      ...w,
      currentBasho: { ...w.currentBasho!, day: 2 },
    }));

    const result = advanceOneDay(world);

    const standings = result.currentBasho?.standings;
    expect(standings).toBeDefined();
    if (standings) {
      const eastRecord = standings.get("r-east");
      const westRecord = standings.get("r-west");
      const totalWins = (eastRecord?.wins ?? 0) + (westRecord?.wins ?? 0);
      expect(totalWins).toBe(1);
    }
  });

  it("advanceOneDay on day 15 advances basho day beyond 15", () => {
    const world = makeBashoWorld(15);

    (worldEngine.simulateBoutForToday as any).mockImplementation((w: WorldState) => ({
      world: {
        ...w,
        currentBasho: {
          ...w.currentBasho!,
          matches: (w.currentBasho?.matches ?? []).map((m) =>
            m.day === w.currentBasho!.day && !m.result ? { ...m, result: mockBoutResult } : m
          ),
        },
      },
      result: mockBoutResult,
    }));

    (worldEngine.advanceBashoDay as any).mockImplementation((w: WorldState) => ({
      ...w,
      currentBasho: { ...w.currentBasho!, day: 16, currentDay: 16 },
    }));

    const result = advanceOneDay(world);
    expect(result.currentBasho?.day).toBeGreaterThan(15);
  });
});

describe("P1.2: Basho pipeline — already-played bouts are not re-simulated", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("advanceOneDay does not re-simulate bouts that already have results", () => {
    const world = makeBashoWorld(1);
    const matches = world.currentBasho!.matches!;
    matches[0].result = mockBoutResult;

    (worldEngine.simulateBoutForToday as any).mockImplementation((w: WorldState) => {
      const basho = w.currentBasho;
      if (!basho) return { world: w };
      const todays = (basho.matches ?? []).filter(
        (m) => m.day === basho.day && !m.result
      );
      if (todays.length === 0) return { world: w };
      return { world: w, result: mockBoutResult };
    });

    (worldEngine.advanceBashoDay as any).mockImplementation((w: WorldState) => ({
      ...w,
      currentBasho: { ...w.currentBasho!, day: 2 },
    }));

    const result = advanceOneDay(world);

    // simulateBoutForToday should NOT have been called — all bouts already have results
    expect(worldEngine.simulateBoutForToday).not.toHaveBeenCalled();

    const day1Matches = result.currentBasho?.matches?.filter((m) => m.day === 1) ?? [];
    expect(day1Matches[0].result?.winnerRikishiId).toBe("r-east");
  });
});

describe("P1.2: Basho pipeline — phase does not run outside active_basho", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("advanceOneDay during interim does NOT call phase01_basho_bouts", () => {
    const world = makeBashoWorld(1, { cyclePhase: "interim" });

    (worldEngine.simulateBoutForToday as any).mockImplementation(() => ({
      world,
      result: mockBoutResult,
    }));
    (worldEngine.advanceBashoDay as any).mockImplementation((w: WorldState) => w);

    advanceOneDay(world);

    expect(worldEngine.simulateBoutForToday).not.toHaveBeenCalled();
  });
});
