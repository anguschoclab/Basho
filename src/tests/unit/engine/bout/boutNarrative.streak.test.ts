import { describe, it, expect, beforeEach } from "vitest";
import { generateBoutNarrative } from "@/engine/bout/boutNarrative";
import { BardEngine } from "@/engine/bard/BardEngine";
import { mockRikishi, makeMockWorld, makeMockBasho } from "../utils";
import type { BoutResult, BashoName } from "@/engine/types/basho";
import type { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";

function makeMinimalBoutResult(overrides: Partial<BoutResult> = {}): BoutResult {
  return {
    boutId: "test-bout-streak",
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
  west: ReturnType<typeof mockRikishi>
): WorldState {
  return makeMockWorld({
    rikishi: new Map([
      [east.id, east],
      [west.id, west],
    ]),
  }) as WorldState;
}

function getOpeningLines(result: BoutResult): string[] {
  return (result.pbpLines ?? []).filter((l) => l.phase === "opening").map((l) => l.text);
}

function isStreakLine(text: string): boolean {
  return (
    text.includes("Consecutive Victories") ||
    text.includes("and Counting") ||
    text.includes("Win Streak") ||
    text.includes("Hot Streak") ||
    text.includes("Straight Wins") ||
    text.includes("Rewrites the Narrative") ||
    text.includes("Keeps Rolling") ||
    text.includes("Extends Win Streak") ||
    text.includes("Surges to") ||
    text.includes("History in the Making") ||
    text.includes("Perfection Intact") ||
    text.includes("The Streak Survives") ||
    text.includes("Red Hot") ||
    text.includes("The Momentum Builds") ||
    text.includes("Without a Blemish") ||
    text.includes("On the March") ||
    text.includes("Quietly Dominant")
  );
}

describe("generateBoutNarrative — win-streak PbP injection", () => {
  beforeEach(() => {
    BardEngine.resetCache();
  });

  it("5-win streak → media.streaks.notable line in opening", () => {
    const east = mockRikishi("r-east", { shikona: "Asanoyama", currentBashoWins: 5 });
    const west = mockRikishi("r-west", { shikona: "Terunofuji", currentBashoWins: 2 });
    const world = makeWorld(east, west);
    const result = makeMinimalBoutResult();

    generateBoutNarrative(result, east, west, "hatsu" as BashoName, 1, "seed-streak-5", world);

    const openings = getOpeningLines(result);
    const streakLine = openings.find(isStreakLine);
    expect(streakLine).toBeDefined();
    expect(streakLine!).toContain("Asanoyama");
    expect(streakLine!).toContain("5");
  });

  it("8-win streak → media.streaks.hot line", () => {
    const east = mockRikishi("r-east", { shikona: "Asanoyama", currentBashoWins: 8 });
    const west = mockRikishi("r-west", { shikona: "Terunofuji", currentBashoWins: 2 });
    const world = makeWorld(east, west);
    const result = makeMinimalBoutResult();

    generateBoutNarrative(result, east, west, "hatsu" as BashoName, 1, "seed-streak-8", world);

    const openings = getOpeningLines(result);
    const streakLine = openings.find(isStreakLine);
    expect(streakLine).toBeDefined();
    expect(streakLine!).toContain("8");
  });

  it("12-win streak → media.streaks.legendary line", () => {
    const east = mockRikishi("r-east", { shikona: "Asanoyama", currentBashoWins: 12 });
    const west = mockRikishi("r-west", { shikona: "Terunofuji", currentBashoWins: 2 });
    const world = makeWorld(east, west);
    const result = makeMinimalBoutResult();

    generateBoutNarrative(result, east, west, "hatsu" as BashoName, 1, "seed-streak-12", world);

    const openings = getOpeningLines(result);
    const streakLine = openings.find(isStreakLine);
    expect(streakLine).toBeDefined();
    expect(streakLine!).toContain("12");
  });

  it("4-win streak → no streak line (below threshold)", () => {
    const east = mockRikishi("r-east", { shikona: "Asanoyama", currentBashoWins: 4 });
    const west = mockRikishi("r-west", { shikona: "Terunofuji", currentBashoWins: 2 });
    const world = makeWorld(east, west);
    const result = makeMinimalBoutResult();

    generateBoutNarrative(result, east, west, "hatsu" as BashoName, 1, "seed-streak-4", world);

    const openings = getOpeningLines(result);
    const streakLine = openings.find(isStreakLine);
    expect(streakLine).toBeUndefined();
  });

  it("both wrestlers have high streaks → higher one is featured", () => {
    const east = mockRikishi("r-east", { shikona: "Asanoyama", currentBashoWins: 10 });
    const west = mockRikishi("r-west", { shikona: "Terunofuji", currentBashoWins: 9 });
    const world = makeWorld(east, west);
    const result = makeMinimalBoutResult();

    generateBoutNarrative(result, east, west, "hatsu" as BashoName, 1, "seed-streak-both", world);

    const openings = getOpeningLines(result);
    const streakLine = openings.find(isStreakLine);
    expect(streakLine).toBeDefined();
    expect(streakLine!).toContain("Asanoyama");
    expect(streakLine!).toContain("10");
  });

  it("currentBashoWins undefined → no streak line, no error", () => {
    const east = mockRikishi("r-east", { shikona: "Asanoyama" });
    delete (east as Partial<typeof east>).currentBashoWins;
    const west = mockRikishi("r-west", { shikona: "Terunofuji" });
    delete (west as Partial<typeof west>).currentBashoWins;
    const world = makeWorld(east, west);
    const result = makeMinimalBoutResult();

    expect(() => {
      generateBoutNarrative(
        result,
        east,
        west,
        "hatsu" as BashoName,
        1,
        "seed-streak-undef",
        world
      );
    }).not.toThrow();

    const openings = getOpeningLines(result);
    const streakLine = openings.find(isStreakLine);
    expect(streakLine).toBeUndefined();
  });

  it("streak line has phase 'opening' and tags including 'dominant'", () => {
    const east = mockRikishi("r-east", { shikona: "Asanoyama", currentBashoWins: 7 });
    const west = mockRikishi("r-west", { shikona: "Terunofuji", currentBashoWins: 2 });
    const world = makeWorld(east, west);
    const result = makeMinimalBoutResult();

    generateBoutNarrative(result, east, west, "hatsu" as BashoName, 1, "seed-streak-tags", world);

    const streakLines = (result.pbpLines ?? []).filter(
      (l) => l.phase === "opening" && (l.tags?.includes("dominant") ?? false)
    );
    expect(streakLines.length).toBeGreaterThan(0);
  });

  it("no [MISSING:] tokens in streak line", () => {
    const east = mockRikishi("r-east", { shikona: "Asanoyama", currentBashoWins: 6 });
    const west = mockRikishi("r-west", { shikona: "Terunofuji", currentBashoWins: 2 });
    const world = makeWorld(east, west);
    const result = makeMinimalBoutResult();

    generateBoutNarrative(
      result,
      east,
      west,
      "hatsu" as BashoName,
      1,
      "seed-streak-missing",
      world
    );

    for (const line of result.pbpLines ?? []) {
      expect(line.text).not.toContain("[MISSING:");
    }
  });
});

describe("generateBoutNarrative — streak logic: currentWinStreak vs total wins (B.9-B.12)", () => {
  beforeEach(() => {
    BardEngine.resetCache();
  });

  function makeStreakWorld(opts?: {
    east?: Partial<Rikishi>;
    west?: Partial<Rikishi>;
    standings?: Map<string, { wins: number; losses: number; absences?: number }>;
    day?: number;
  }): { world: WorldState; east: Rikishi; west: Rikishi; result: BoutResult } {
    const east = mockRikishi("east", { shikona: "East Rikishi", ...opts?.east });
    const west = mockRikishi("west", { shikona: "West Rikishi", ...opts?.west });
    const day = opts?.day ?? 7;
    const basho = makeMockBasho({
      day,
      standings:
        opts?.standings ??
        new Map([
          ["east", { wins: 0, losses: 0, absences: 0 }],
          ["west", { wins: 0, losses: 0, absences: 0 }],
        ]),
    });
    const world = makeMockWorld({
      rikishi: new Map([
        ["east", east],
        ["west", west],
      ]),
      currentBasho: basho,
    }) as WorldState;

    const result: BoutResult = {
      boutId: "test-bout",
      winner: "east",
      winnerRikishiId: "east",
      loserRikishiId: "west",
      kimarite: "oshidashi",
      kimariteName: "Oshidashi",
      stance: "migi-yotsu",
      tachiaiWinner: "east",
      duration: 5.2,
      upset: false,
      isKinboshi: false,
      log: [],
      kenshoEnvelopes: 0,
    } as unknown as BoutResult;

    return { world, east, west, result };
  }

  it("B.9: streak_continued fires when currentWinStreak >= 3 (not total wins)", () => {
    const { world, east, west, result } = makeStreakWorld({
      east: { currentWinStreak: 3, currentBashoWins: 5 } as any,
      day: 7,
    });
    generateBoutNarrative(result, east, west, "hatsu" as BashoName, 7, "test-seed", world);
    const streakLine = result.pbpLines?.find((l) => l.tags?.includes("streak"));
    expect(streakLine).toBeDefined();
  });

  it("B.10: streak_continued does NOT fire when currentWinStreak < 3 even if total wins >= 3", () => {
    const { world, east, west, result } = makeStreakWorld({
      east: { currentWinStreak: 1, currentBashoWins: 5 } as any,
      day: 7,
    });
    generateBoutNarrative(result, east, west, "hatsu" as BashoName, 7, "test-seed", world);
    const streakLines = result.pbpLines?.filter((l) => l.tags?.includes("streak"));
    const streakContinued = streakLines?.find(
      (l) => l.text?.includes("streak") || l.text?.includes("winning")
    );
    expect(streakContinued).toBeUndefined();
  });

  it("B.11: streak_snapped fires when loser had currentWinStreak >= 3", () => {
    const { world, east, west, result } = makeStreakWorld({
      west: { currentWinStreak: 3, currentBashoWins: 4 } as any,
      day: 7,
    });
    generateBoutNarrative(result, east, west, "hatsu" as BashoName, 7, "test-seed", world);
    const streakLines = result.pbpLines?.filter((l) => l.tags?.includes("streak"));
    expect(streakLines?.length).toBeGreaterThan(0);
  });

  it("B.12: loss_streak fires when currentLossStreak >= 3 and currentWinStreak === 0", () => {
    const { world, east, west, result } = makeStreakWorld({
      west: { currentLossStreak: 3, currentBashoWins: 0, currentBashoLosses: 3 } as any,
      day: 7,
    });
    generateBoutNarrative(result, east, west, "hatsu" as BashoName, 7, "test-seed", world);
    const winlessLines = result.pbpLines?.filter((l) => l.tags?.includes("winless"));
    expect(winlessLines?.length).toBeGreaterThan(0);
  });
});
