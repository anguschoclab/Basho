import { describe, it, expect, vi } from "vitest";
import { projectBashoResults } from "@/presenters/projections/eventProjections";
import { makeMockWorld, mockRikishi } from "../engine/utils";
import type { BashoResult, MatchSchedule, BoutResult } from "@/engine/types/basho";

vi.mock("@/presenters/rikishi", () => ({
  projectRikishi: vi.fn((r: { id: string; shikona: string; heyaId?: string }) => ({
    id: r.id,
    shikona: r.shikona,
    heyaId: r.heyaId,
    perceivedStats: { strength: "Dominant" },
  })),
}));

function makeBashoResult(overrides: Partial<BashoResult> = {}): BashoResult {
  return {
    id: "basho-1",
    year: 2025,
    bashoNumber: 1,
    bashoName: "hatsu",
    yusho: "none",
    junYusho: [],
    prizes: { yushoAmount: 0, junYushoAmount: 0, specialPrizes: 0 },
    ...overrides,
  } as BashoResult;
}

function makeMatch(
  eastId: string,
  westId: string,
  result: Partial<BoutResult> = {}
): MatchSchedule {
  return {
    boutId: `bout-${eastId}-${westId}`,
    day: 1,
    eastRikishiId: eastId,
    westRikishiId: westId,
    result: {
      boutId: `bout-${eastId}-${westId}`,
      winner: "east",
      winnerRikishiId: eastId,
      loserRikishiId: westId,
      kimarite: "yorikiri" as any,
      kimariteName: "yorikiri",
      stance: "migi" as any,
      tachiaiWinner: "east" as any,
      duration: 10,
      upset: false,
      kenshoEnvelopes: 0,
      momentumScore: 0,
      inBoutInjury: null,
      isTimeout: false,
      log: [],
      ...result,
    } as BoutResult,
  };
}

describe("projectBashoResults", () => {
  it("returns champion data when yusho winner exists", () => {
    const r1 = mockRikishi("r1", { shikona: "Champion", heyaId: "h1" });
    const world = makeMockWorld({ rikishi: new Map([["r1", r1]]) });
    world.heyas.set("h1", { id: "h1", name: "Stable One" } as any);

    const basho = makeBashoResult({ yusho: "r1" });
    const result = projectBashoResults(world, basho);

    expect(result.champion).not.toBeNull();
    expect(result.champion?.rikishi?.id).toBe("r1");
    expect(result.champion?.heyaName).toBe("Stable One");
  });

  it("returns null champion when yusho is 'none'", () => {
    const world = makeMockWorld({});
    const basho = makeBashoResult({ yusho: "none" });
    const result = projectBashoResults(world, basho);
    expect(result.champion).toBeNull();
  });

  it("returns junYusho list with valid rikishi", () => {
    const r1 = mockRikishi("r1", { shikona: "Runner1", heyaId: "h1" });
    const r2 = mockRikishi("r2", { shikona: "Runner2", heyaId: "h1" });
    const world = makeMockWorld({
      rikishi: new Map([
        ["r1", r1],
        ["r2", r2],
      ]),
    });
    world.heyas.set("h1", { id: "h1", name: "Stable One" } as any);

    const basho = makeBashoResult({ junYusho: ["r1", "r2"] });
    const result = projectBashoResults(world, basho);

    expect(result.junYusho).toHaveLength(2);
    expect(result.junYusho[0].rikishi.id).toBe("r1");
    expect(result.junYusho[1].rikishi.id).toBe("r2");
  });

  it("filters out null junYusho entries for missing rikishi", () => {
    const r1 = mockRikishi("r1", { shikona: "Runner1", heyaId: "h1" });
    const world = makeMockWorld({ rikishi: new Map([["r1", r1]]) });
    world.heyas.set("h1", { id: "h1", name: "Stable One" } as any);

    const basho = makeBashoResult({ junYusho: ["r1", "missing"] });
    const result = projectBashoResults(world, basho);

    expect(result.junYusho).toHaveLength(1);
    expect(result.junYusho[0].rikishi.id).toBe("r1");
  });

  it("returns empty junYusho list when input is empty", () => {
    const world = makeMockWorld({ rikishi: new Map() });
    const basho = makeBashoResult({ junYusho: [] });
    const result = projectBashoResults(world, basho);
    expect(result.junYusho).toEqual([]);
  });

  it("returns empty junYusho list when all entries are missing", () => {
    const world = makeMockWorld({ rikishi: new Map() });
    const basho = makeBashoResult({ junYusho: ["ghost1", "ghost2"] });
    const result = projectBashoResults(world, basho);
    expect(result.junYusho).toEqual([]);
  });

  it("preserves junYusho order when valid entries are interspersed with missing ids", () => {
    const r1 = mockRikishi("r1", { shikona: "Runner1", heyaId: "h1" });
    const r2 = mockRikishi("r2", { shikona: "Runner2", heyaId: "h1" });
    const world = makeMockWorld({
      rikishi: new Map([
        ["r1", r1],
        ["r2", r2],
      ]),
    });
    world.heyas.set("h1", { id: "h1", name: "Stable One" } as any);

    const basho = makeBashoResult({ junYusho: ["missing", "r1", "missing", "r2"] });
    const result = projectBashoResults(world, basho);

    expect(result.junYusho).toHaveLength(2);
    expect(result.junYusho[0].rikishi.id).toBe("r1");
    expect(result.junYusho[1].rikishi.id).toBe("r2");
  });

  it("returns kinboshi entries from matches with isKinboshi", () => {
    const maegashira = mockRikishi("m1", { shikona: "Giant Killer", heyaId: "h1" });
    const yokozuna = mockRikishi("y1", { shikona: "Yokozuna", heyaId: "h2" });
    const world = makeMockWorld({
      rikishi: new Map([
        ["m1", maegashira],
        ["y1", yokozuna],
      ]),
    });
    world.heyas.set("h1", { id: "h1", name: "Stable A" } as any);
    world.heyas.set("h2", { id: "h2", name: "Stable B" } as any);

    const match = makeMatch("m1", "y1", {
      isKinboshi: true,
      winnerRikishiId: "m1",
      loserRikishiId: "y1",
    });
    world.currentBasho = { matches: [match] } as any;

    const basho = makeBashoResult();
    const result = projectBashoResults(world, basho);

    expect(result.kinboshi).toHaveLength(1);
    expect(result.kinboshi[0].winner.id).toBe("m1");
    expect(result.kinboshi[0].loser.id).toBe("y1");
  });

  it("skips non-kinboshi matches", () => {
    const r1 = mockRikishi("r1", { heyaId: "h1" });
    const r2 = mockRikishi("r2", { heyaId: "h2" });
    const world = makeMockWorld({
      rikishi: new Map([
        ["r1", r1],
        ["r2", r2],
      ]),
    });
    world.heyas.set("h1", { id: "h1", name: "H1" } as any);
    world.heyas.set("h2", { id: "h2", name: "H2" } as any);

    const match = makeMatch("r1", "r2", { isKinboshi: false });
    world.currentBasho = { matches: [match] } as any;

    const basho = makeBashoResult();
    const result = projectBashoResults(world, basho);

    expect(result.kinboshi).toHaveLength(0);
  });

  it("returns prize winner projections when IDs exist", () => {
    const r1 = mockRikishi("r1", { shikona: "Technician", heyaId: "h1" });
    const r2 = mockRikishi("r2", { shikona: "Fighter", heyaId: "h1" });
    const r3 = mockRikishi("r3", { shikona: "Spirit", heyaId: "h1" });
    const world = makeMockWorld({
      rikishi: new Map([
        ["r1", r1],
        ["r2", r2],
        ["r3", r3],
      ]),
    });

    const basho = makeBashoResult({ ginoSho: "r1", shukunsho: "r2", kantosho: "r3" });
    const result = projectBashoResults(world, basho);

    expect(result.ginoSho?.id).toBe("r1");
    expect(result.shukunSho?.id).toBe("r2");
    expect(result.kantoSho?.id).toBe("r3");
  });

  it("returns null prize winners when IDs are missing", () => {
    const world = makeMockWorld({});
    const basho = makeBashoResult();
    const result = projectBashoResults(world, basho);

    expect(result.ginoSho).toBeNull();
    expect(result.shukunSho).toBeNull();
    expect(result.kantoSho).toBeNull();
  });

  it("caches projectRikishi — same rikishi in multiple kinboshi gets same projection object", () => {
    const maegashira = mockRikishi("m1", { shikona: "Giant Killer", heyaId: "h1" });
    const yokozuna1 = mockRikishi("y1", { shikona: "Yokozuna1", heyaId: "h2" });
    const yokozuna2 = mockRikishi("y2", { shikona: "Yokozuna2", heyaId: "h3" });
    const world = makeMockWorld({
      rikishi: new Map([
        ["m1", maegashira],
        ["y1", yokozuna1],
        ["y2", yokozuna2],
      ]),
    });
    world.heyas.set("h1", { id: "h1", name: "Stable A" } as any);
    world.heyas.set("h2", { id: "h2", name: "Stable B" } as any);
    world.heyas.set("h3", { id: "h3", name: "Stable C" } as any);

    const match1 = makeMatch("m1", "y1", {
      isKinboshi: true,
      winnerRikishiId: "m1",
      loserRikishiId: "y1",
    });
    const match2 = makeMatch("m1", "y2", {
      isKinboshi: true,
      winnerRikishiId: "m1",
      loserRikishiId: "y2",
    });
    world.currentBasho = { matches: [match1, match2] } as any;

    const basho = makeBashoResult({ yusho: "m1" });
    const result = projectBashoResults(world, basho);

    expect(result.kinboshi).toHaveLength(2);
    const winnerProjection1 = result.kinboshi[0].winner;
    const winnerProjection2 = result.kinboshi[1].winner;
    expect(winnerProjection1.id).toBe("m1");
    expect(winnerProjection2.id).toBe("m1");
    expect(winnerProjection1).toBe(winnerProjection2);
    expect(result.champion?.rikishi).toBe(winnerProjection1);
  });

  it("handles missing rikishi in kinboshi gracefully", () => {
    const world = makeMockWorld({ rikishi: new Map() });
    const match = makeMatch("missing1", "missing2", {
      isKinboshi: true,
      winnerRikishiId: "missing1",
      loserRikishiId: "missing2",
    });
    world.currentBasho = { matches: [match] } as any;

    const basho = makeBashoResult();
    const result = projectBashoResults(world, basho);

    expect(result.kinboshi).toHaveLength(0);
  });

  it("detects player champion", () => {
    const r1 = mockRikishi("r1", { shikona: "Champion", heyaId: "player-heya" });
    const world = makeMockWorld({
      rikishi: new Map([["r1", r1]]),
      playerHeyaId: "player-heya",
    });
    world.heyas.set("player-heya", { id: "player-heya", name: "Player Stable" } as any);

    const basho = makeBashoResult({ yusho: "r1" });
    const result = projectBashoResults(world, basho);

    expect(result.isPlayerChampion).toBe(true);
  });
});
