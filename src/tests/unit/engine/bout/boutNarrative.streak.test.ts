import { describe, it, expect, beforeEach } from "vitest";
import { generateBoutNarrative } from "@/engine/bout/boutNarrative";
import { BardEngine } from "@/engine/bard/BardEngine";
import { mockRikishi, makeMockWorld } from "../utils";
import type { BoutResult, BashoName } from "@/engine/types/basho";
import type { WorldState } from "@/engine/types/world";

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
  return (result.pbpLines ?? [])
    .filter((l) => l.phase === "opening")
    .map((l) => l.text);
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
    text.includes("Surges to")
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
      generateBoutNarrative(result, east, west, "hatsu" as BashoName, 1, "seed-streak-undef", world);
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

    generateBoutNarrative(result, east, west, "hatsu" as BashoName, 1, "seed-streak-missing", world);

    for (const line of result.pbpLines ?? []) {
      expect(line.text).not.toContain("[MISSING:");
    }
  });
});
