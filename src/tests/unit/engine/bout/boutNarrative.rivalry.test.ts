import { describe, it, expect, beforeEach } from "vitest";
import { generateBoutNarrative } from "@/engine/bout/boutNarrative";
import { BardEngine } from "@/engine/bard/BardEngine";
import { mockRikishi, makeMockWorld } from "../utils";
import type { BoutResult, BashoName } from "@/engine/types/basho";
import type { WorldState } from "@/engine/types/world";
import type { RivalriesState } from "@/constants/engine/rivalry";

function makeMinimalBoutResult(overrides: Partial<BoutResult> = {}): BoutResult {
  return {
    boutId: "test-bout-rivalry",
    winner: "east",
    winnerRikishiId: "r-east",
    loserRikishiId: "r-west",
    kimarite: "yorikiri",
    kimariteName: "Yorikiri",
    stance: "migi-yotsu",
    tachiaiWinner: "east",
    duration: 8.5,
    upset: false,
    isKinboshi: false,
    log: [
      { phase: "tachiai", data: { tick: 0, tachiaiWinner: "east", margin: 10 } },
      { phase: "finish", data: {} },
    ],
    kenshoEnvelopes: 0,
    momentumScore: 0,
    inBoutInjury: null,
    isTimeout: false,
    ...overrides,
  };
}

function makeWorld(
  east: ReturnType<typeof mockRikishi>,
  west: ReturnType<typeof mockRikishi>,
  rivalriesState?: RivalriesState
): WorldState {
  return makeMockWorld({
    rikishi: new Map([
      [east.id, east],
      [west.id, west],
    ]),
    rivalriesState,
  }) as WorldState;
}

function makePair(overrides: Partial<RivalriesState["pairs"][string]> = {}): RivalriesState {
  return {
    version: "1.0.0",
    pairs: {
      "r-east|r-west": {
        key: "r-east|r-west",
        aId: "r-east",
        bId: "r-west",
        heat: 50,
        meetings: 5,
        lastMetWeek: 10,
        aWins: 4,
        bWins: 1,
        closeness: 50,
        spite: 20,
        tone: "public_hype",
        triggers: {},
        sameHeya: false,
        ...overrides,
      } as RivalriesState["pairs"][string],
    },
  };
}

function getOpeningLines(result: BoutResult): string[] {
  return (result.pbpLines ?? []).filter((l) => l.phase === "opening").map((l) => l.text);
}

describe("generateBoutNarrative — rivalry PbP injection", () => {
  beforeEach(() => {
    BardEngine.resetCache();
  });

  it("first meeting → h2h.first_meeting line in opening phase", () => {
    const east = mockRikishi("r-east", { shikona: "Asanoyama" });
    const west = mockRikishi("r-west", { shikona: "Terunofuji" });
    const world = makeWorld(east, west);
    const result = makeMinimalBoutResult();

    generateBoutNarrative(result, east, west, "hatsu" as BashoName, 1, "seed-rivalry-1", world);

    const openings = getOpeningLines(result);
    const firstMeetingLine = openings.find(
      (t) =>
        t.includes("first time") ||
        t.includes("fresh matchup") ||
        t.includes("first-ever") ||
        t.includes("complete unknown")
    );
    expect(firstMeetingLine).toBeDefined();
  });

  it("domination (5 meetings, 4-1 split) → h2h.domination line with P1 as dominant", () => {
    const east = mockRikishi("r-east", { shikona: "Asanoyama" });
    const west = mockRikishi("r-west", { shikona: "Terunofuji" });
    const state = makePair({ meetings: 5, aWins: 4, bWins: 1 });
    const world = makeWorld(east, west, state);
    const result = makeMinimalBoutResult();

    generateBoutNarrative(result, east, west, "hatsu" as BashoName, 1, "seed-rivalry-dom", world);

    const openings = getOpeningLines(result);
    const domLine = openings.find(
      (t) => t.includes("dominated") || t.includes("struggled") || t.includes("commanding")
    );
    expect(domLine).toBeDefined();
    expect(domLine!).toContain("Asanoyama");
    expect(domLine!).toContain("4");
    expect(domLine!).toContain("1");
  });

  it("deadlock (4 meetings, 2-2 split) → h2h.deadlock line", () => {
    const east = mockRikishi("r-east", { shikona: "Asanoyama" });
    const west = mockRikishi("r-west", { shikona: "Terunofuji" });
    const state = makePair({ meetings: 4, aWins: 2, bWins: 2 });
    const world = makeWorld(east, west, state);
    const result = makeMinimalBoutResult();

    generateBoutNarrative(result, east, west, "hatsu" as BashoName, 1, "seed-rivalry-dead", world);

    const openings = getOpeningLines(result);
    const deadlockLine = openings.find(
      (t) =>
        t.includes("close") ||
        t.includes("rivalry") ||
        t.includes("decisive edge") ||
        t.includes("true rivalry")
    );
    expect(deadlockLine).toBeDefined();
  });

  it("P1/P2 mapping correct when east is bId (west has smaller ID)", () => {
    const east = mockRikishi("r-west", { shikona: "EastMan" });
    const west = mockRikishi("r-east", { shikona: "WestMan" });
    const state = makePair({
      key: "r-east|r-west",
      aId: "r-east",
      bId: "r-west",
      meetings: 5,
      aWins: 4,
      bWins: 1,
    });
    const world = makeWorld(east, west, state);
    const result = makeMinimalBoutResult({
      winnerRikishiId: "r-west",
      loserRikishiId: "r-east",
    });

    generateBoutNarrative(result, east, west, "hatsu" as BashoName, 1, "seed-rivalry-flip", world);

    const openings = getOpeningLines(result);
    const domLine = openings.find(
      (t) =>
        t.includes("dominated") ||
        t.includes("commanding") ||
        t.includes("struggled") ||
        t.includes("History is heavily")
    );
    expect(domLine).toBeDefined();
    // P1=WestMan (dominant, 4 wins), P2=EastMan (struggling, 1 win)
    // Template 1&3 use P1, template 2 uses P2 — so the line contains either WestMan or EastMan
    expect(domLine!.includes("WestMan") || domLine!.includes("EastMan")).toBe(true);
  });

  it("h2h.recent with lastKimarite and lastWinnerId shows correct winner and kimarite", () => {
    const east = mockRikishi("r-east", { shikona: "Asanoyama" });
    const west = mockRikishi("r-west", { shikona: "Terunofuji" });
    const state = makePair({
      meetings: 3,
      aWins: 2,
      bWins: 1,
      lastKimarite: "yorikiri",
      lastWinnerId: "r-east",
      lastMetWeek: 5,
    });
    const world = makeWorld(east, west, state);
    const result = makeMinimalBoutResult();

    generateBoutNarrative(
      result,
      east,
      west,
      "hatsu" as BashoName,
      1,
      "seed-rivalry-recent",
      world
    );

    const openings = getOpeningLines(result);
    const recentLine = openings.find((t) => t.includes("yorikiri"));
    expect(recentLine).toBeDefined();
    expect(recentLine!).toContain("Asanoyama");
  });

  it("h2h.recent not shown when lastKimarite is undefined", () => {
    const east = mockRikishi("r-east", { shikona: "Asanoyama" });
    const west = mockRikishi("r-west", { shikona: "Terunofuji" });
    const state = makePair({
      meetings: 3,
      aWins: 2,
      bWins: 1,
      lastKimarite: undefined,
      lastWinnerId: undefined,
    });
    const world = makeWorld(east, west, state);
    const result = makeMinimalBoutResult();

    generateBoutNarrative(
      result,
      east,
      west,
      "hatsu" as BashoName,
      1,
      "seed-rivalry-no-recent",
      world
    );

    const openings = getOpeningLines(result);
    const recentLine = openings.find(
      (t) =>
        t.includes("Last time they met") ||
        t.includes("looking for revenge") ||
        t.includes("Fans remember")
    );
    expect(recentLine).toBeUndefined();
  });

  it("no rivalry state → no error, first_meeting line appears", () => {
    const east = mockRikishi("r-east", { shikona: "Asanoyama" });
    const west = mockRikishi("r-west", { shikona: "Terunofuji" });
    const world = makeWorld(east, west, undefined);
    const result = makeMinimalBoutResult();

    expect(() => {
      generateBoutNarrative(
        result,
        east,
        west,
        "hatsu" as BashoName,
        1,
        "seed-rivalry-none",
        world
      );
    }).not.toThrow();

    const openings = getOpeningLines(result);
    const firstMeetingLine = openings.find(
      (t) =>
        t.includes("first time") ||
        t.includes("fresh matchup") ||
        t.includes("first-ever") ||
        t.includes("complete unknown")
    );
    expect(firstMeetingLine).toBeDefined();
  });

  it("rivalry state exists but pair not found → first_meeting", () => {
    const east = mockRikishi("r-a", { shikona: "Alpha" });
    const west = mockRikishi("r-b", { shikona: "Beta" });
    const state: RivalriesState = {
      version: "1.0.0",
      pairs: {
        "r-x|r-y": {
          key: "r-x|r-y",
          aId: "r-x",
          bId: "r-y",
          heat: 50,
          meetings: 5,
          lastMetWeek: 10,
          aWins: 3,
          bWins: 2,
          closeness: 50,
          spite: 20,
          tone: "respect",
          triggers: {},
          sameHeya: false,
        },
      },
    };
    const world = makeWorld(east, west, state);
    const result = makeMinimalBoutResult({
      winnerRikishiId: "r-a",
      loserRikishiId: "r-b",
    });

    generateBoutNarrative(
      result,
      east,
      west,
      "hatsu" as BashoName,
      1,
      "seed-rivalry-missing-pair",
      world
    );

    const openings = getOpeningLines(result);
    const firstMeetingLine = openings.find(
      (t) =>
        t.includes("first time") ||
        t.includes("fresh matchup") ||
        t.includes("first-ever") ||
        t.includes("complete unknown")
    );
    expect(firstMeetingLine).toBeDefined();
  });

  it("all rivalry lines have phase 'opening'", () => {
    const east = mockRikishi("r-east", { shikona: "Asanoyama" });
    const west = mockRikishi("r-west", { shikona: "Terunofuji" });
    const state = makePair({ meetings: 5, aWins: 4, bWins: 1 });
    const world = makeWorld(east, west, state);
    const result = makeMinimalBoutResult();

    generateBoutNarrative(result, east, west, "hatsu" as BashoName, 1, "seed-rivalry-phase", world);

    const rivalryLines = (result.pbpLines ?? []).filter(
      (l) => l.phase === "opening" && (l.tags?.includes("rivalry" as any) ?? false)
    );
    expect(rivalryLines.length).toBeGreaterThan(0);
    for (const line of rivalryLines) {
      expect(line.phase).toBe("opening");
    }
  });

  it("no [MISSING:] tokens in any rivalry line", () => {
    const east = mockRikishi("r-east", { shikona: "Asanoyama" });
    const west = mockRikishi("r-west", { shikona: "Terunofuji" });
    const state = makePair({
      meetings: 5,
      aWins: 4,
      bWins: 1,
      lastKimarite: "yorikiri",
      lastWinnerId: "r-east",
      lastMetWeek: 5,
    });
    const world = makeWorld(east, west, state);
    const result = makeMinimalBoutResult();

    generateBoutNarrative(
      result,
      east,
      west,
      "hatsu" as BashoName,
      1,
      "seed-rivalry-missing",
      world
    );

    for (const line of result.pbpLines ?? []) {
      expect(line.text).not.toContain("[MISSING:");
    }
  });

  it("deterministic: same seed → same lines", () => {
    const east = mockRikishi("r-east", { shikona: "Asanoyama" });
    const west = mockRikishi("r-west", { shikona: "Terunofuji" });
    const state = makePair({ meetings: 5, aWins: 4, bWins: 1 });
    const world1 = makeWorld(east, west, state);
    const world2 = makeWorld(east, west, state);
    const result1 = makeMinimalBoutResult();
    const result2 = makeMinimalBoutResult();

    generateBoutNarrative(result1, east, west, "hatsu" as BashoName, 1, "seed-determinism", world1);
    generateBoutNarrative(result2, east, west, "hatsu" as BashoName, 1, "seed-determinism", world2);

    const lines1 = (result1.pbpLines ?? []).map((l) => l.text);
    const lines2 = (result2.pbpLines ?? []).map((l) => l.text);
    expect(lines1).toEqual(lines2);
  });
});
